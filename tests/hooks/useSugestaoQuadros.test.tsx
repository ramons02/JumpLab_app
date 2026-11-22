import { act, renderHook } from '@testing-library/react-native';

import { RascunhoAvaliacaoProvider, useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import { useSugestaoQuadros } from '@/hooks/useSugestaoQuadros';
import type { NumeroTentativa, VideoSelecionado } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { MOTIVO_PES_INSUFICIENTES, MOTIVO_VIDEO_ILEGIVEL } from '@/utils/sugestaoQuadros';
import { definirVideo, confirmarFps } from '@/utils/tentativas';

import * as deteccao from '../helpers/mockDeteccaoPose';

const CHAO = 0.9;
const AR = 0.7;
const cmj = (q: number) => deteccao.pesNaAltura(q >= 300 && q < 420 ? AR : CHAO);

function video(uri: string): VideoSelecionado {
  return { uri, nome: 'salto.mp4', duracaoS: 4, fpsLido: 240, fpsDoArquivo: 240, temporario: true };
}

async function renderizar(protocolo: Protocol = 'cmj_bi') {
  const hook = await renderHook(
    ({ numero }: { numero: NumeroTentativa }) => ({
      rascunho: useRascunhoAvaliacao(),
      sugestao: useSugestaoQuadros('unica', numero),
    }),
    { wrapper: RascunhoAvaliacaoProvider, initialProps: { numero: 1 as NumeroTentativa } },
  );
  await act(async () =>
    hook.result.current.rascunho.iniciarRascunho({
      pacienteId: 'p1',
      protocolo,
      cargaKg: null,
      dataHora: '2026-11-22T10:30',
      pernaLesionada: 'nenhuma',
    }),
  );
  await act(async () =>
    hook.result.current.rascunho.atualizarTentativas((todas) => ({
      unica: todas.unica?.map((t) => confirmarFps(definirVideo(t, video('file:///a.mp4')))),
    })),
  );
  return hook;
}

beforeEach(() => deteccao.reiniciarDeteccaoPose());

describe('useSugestaoQuadros (spec 018)', () => {
  it('analisa em duas passadas e grava a sugestão pronta', async () => {
    deteccao.simularVideo(960, cmj);
    const { result } = await renderizar();

    await act(async () => result.current.sugestao.sugerir());

    expect(deteccao.analisarQuadros).toHaveBeenCalledTimes(2);
    const [grossa, refino] = deteccao.analisarQuadros.mock.calls.map((c) => c[3]);
    expect(grossa).toHaveLength(240);
    expect(grossa.slice(0, 3)).toEqual([0, 4, 8]);
    expect(refino.every((q) => q % 4 !== 0)).toBe(true);
    expect(result.current.sugestao.sugestao).toEqual({
      estado: 'pronta',
      uri: 'file:///a.mp4',
      quadros: { decolagem: 300, aterrissagem: 420 },
    });
    expect(result.current.sugestao.progresso).toBeNull();
    // a sugestão nunca vira marcação
    expect(result.current.rascunho.rascunho?.tentativas.unica?.[0].marcas).toEqual({});
  });

  it('fica em analisando com o progresso do módulo até o resultado', async () => {
    deteccao.simularVideo(960, cmj);
    deteccao.segurarAnalise();
    const { result } = await renderizar();

    await act(async () => {
      void result.current.sugestao.sugerir();
    });
    expect(result.current.sugestao.sugestao).toEqual({
      estado: 'analisando',
      uri: 'file:///a.mp4',
    });
    await act(async () => deteccao.emitirProgresso(0.5));
    expect(result.current.sugestao.progresso).toBeCloseTo(0.425);

    await act(async () => deteccao.liberarAnalise());
    await act(async () => deteccao.liberarAnalise());
    expect(result.current.sugestao.sugestao?.estado).toBe('pronta');
  });

  it('pés que não aparecem dão a falha com o motivo', async () => {
    deteccao.simularVideo(960, () => ({ pes: null, quadris: null }));
    const { result } = await renderizar();
    await act(async () => result.current.sugestao.sugerir());
    expect(result.current.sugestao.sugestao).toEqual({
      estado: 'falhou',
      uri: 'file:///a.mp4',
      motivo: MOTIVO_PES_INSUFICIENTES,
    });
  });

  it('erro do módulo vira falha de leitura do vídeo', async () => {
    deteccao.simularVideo(960, cmj);
    deteccao.analisarQuadros.mockRejectedValueOnce(new Error('VIDEO_ILEGIVEL'));
    const { result } = await renderizar();
    await act(async () => result.current.sugestao.sugerir());
    expect(result.current.sugestao.sugestao).toMatchObject({
      estado: 'falhou',
      motivo: MOTIVO_VIDEO_ILEGIVEL,
    });
  });

  it('desmontar cancela a análise e não grava resultado', async () => {
    deteccao.simularVideo(960, cmj);
    deteccao.segurarAnalise();
    const { result, unmount } = await renderizar();
    await act(async () => {
      void result.current.sugestao.sugerir();
    });
    await act(async () => unmount());
    expect(deteccao.cancelarAnalise).toHaveBeenCalledTimes(1);
    expect(deteccao.analisesPendentes()).toBe(0);
  });

  it('trocar o vídeo cancela e ignora o resultado da análise antiga', async () => {
    deteccao.simularVideo(960, cmj);
    deteccao.segurarAnalise();
    const { result } = await renderizar();
    await act(async () => {
      void result.current.sugestao.sugerir();
    });
    await act(async () =>
      result.current.rascunho.atualizarTentativas((todas) => ({
        unica: todas.unica?.map((t, i) => (i === 0 ? definirVideo(t, video('file:///b.mp4')) : t)),
      })),
    );
    expect(deteccao.cancelarAnalise).toHaveBeenCalledTimes(1);
    expect(result.current.sugestao.sugestao).toBeNull();
    expect(result.current.sugestao.progresso).toBeNull();
  });

  it('trocar de tentativa durante a análise devolve a anterior a sem sugestão', async () => {
    deteccao.simularVideo(960, cmj);
    deteccao.segurarAnalise();
    const { result, rerender } = await renderizar();
    await act(async () => {
      void result.current.sugestao.sugerir();
    });
    await act(async () => rerender({ numero: 2 }));
    expect(deteccao.cancelarAnalise).toHaveBeenCalledTimes(1);
    expect(result.current.rascunho.rascunho?.tentativas.unica?.[0].sugestao).toBeNull();
  });

  it('sem FPS confirmado não analisa', async () => {
    deteccao.simularVideo(960, cmj);
    const { result } = await renderizar();
    await act(async () =>
      result.current.rascunho.atualizarTentativas((todas) => ({
        unica: todas.unica?.map((t) => ({ ...t, fpsConfirmado: null })),
      })),
    );
    await act(async () => result.current.sugestao.sugerir());
    expect(deteccao.analisarQuadros).not.toHaveBeenCalled();
  });
});
