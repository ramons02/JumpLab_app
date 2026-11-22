import { act, renderHook } from '@testing-library/react-native';

import {
  RascunhoAvaliacaoProvider,
  useRascunhoAvaliacao,
  type DadosRascunho,
} from '@/hooks/useRascunhoAvaliacao';
import { criarTentativasVazias } from '@/utils/tentativas';

const RASCUNHO: DadosRascunho = {
  pacienteId: '11111111-1111-4111-8111-111111111111',
  protocolo: 'cmj_bi',
  cargaKg: null,
  dataHora: '2026-11-22T10:30',
  pernaLesionada: 'direita',
};

function renderizar() {
  return renderHook(() => useRascunhoAvaliacao(), { wrapper: RascunhoAvaliacaoProvider });
}

describe('useRascunhoAvaliacao', () => {
  it('começa sem rascunho', async () => {
    const { result } = await renderizar();
    expect(result.current.rascunho).toBeNull();
  });

  it('iniciarRascunho guarda os dados e cria as tentativas vazias do protocolo', async () => {
    const { result } = await renderizar();
    await act(async () => result.current.iniciarRascunho(RASCUNHO));
    expect(result.current.rascunho).toEqual({
      ...RASCUNHO,
      tentativas: criarTentativasVazias('cmj_bi'),
      serie: null,
    });
  });

  it('atualizarTentativas aplica a alteração sobre as tentativas atuais', async () => {
    const { result } = await renderizar();
    await act(async () => result.current.iniciarRascunho(RASCUNHO));
    await act(async () =>
      result.current.atualizarTentativas((atual) => ({
        ...atual,
        unica: atual.unica?.map((t, i) => (i === 0 ? { ...t, fpsSelecionado: 240 } : t)),
      })),
    );
    expect(result.current.rascunho?.tentativas.unica?.[0].fpsSelecionado).toBe(240);
    expect(result.current.rascunho?.tentativas.unica?.[1].fpsSelecionado).toBeNull();
    expect(result.current.rascunho?.protocolo).toBe('cmj_bi');
  });

  it('atualizarTentativas sem rascunho não faz nada', async () => {
    const { result } = await renderizar();
    await act(async () => result.current.atualizarTentativas(() => ({})));
    expect(result.current.rascunho).toBeNull();
  });

  it('iniciar de novo substitui o rascunho inteiro', async () => {
    const { result } = await renderizar();
    await act(async () => result.current.iniciarRascunho(RASCUNHO));
    const novo: DadosRascunho = { ...RASCUNHO, protocolo: 'agach', cargaKg: 60 };
    await act(async () => result.current.iniciarRascunho(novo));
    expect(result.current.rascunho).toEqual({
      ...novo,
      tentativas: criarTentativasVazias('agach'),
      serie: {
        uriDoVideo: null,
        calibracao: null,
        repeticoes: [{ inicio: null, fundo: null, fim: null }],
      },
    });
  });

  it('descartarRascunho limpa', async () => {
    const { result } = await renderizar();
    await act(async () => result.current.iniciarRascunho(RASCUNHO));
    await act(async () => result.current.descartarRascunho());
    expect(result.current.rascunho).toBeNull();
  });

  it('fora do provider lança erro', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useRascunhoAvaliacao())).rejects.toThrow(
      'useRascunhoAvaliacao precisa estar dentro de RascunhoAvaliacaoProvider.',
    );
    jest.restoreAllMocks();
  });
});
