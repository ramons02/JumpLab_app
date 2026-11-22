import type { TentativaEmAndamento, TentativasPorPerna, VideoSelecionado } from '@/types/attempt';
import {
  confirmarFps,
  criarTentativasVazias,
  definirVideo,
  marcacoesLiberadas,
  pernasDoProtocolo,
  selecionarFps,
  trocarFps,
  videosTemporarios,
} from '@/utils/tentativas';

const VAZIA: TentativaEmAndamento = {
  video: null,
  fpsSelecionado: null,
  fpsConfirmado: null,
  marcas: {},
};

function video(uri: string, fpsLido: number | null, temporario = true): VideoSelecionado {
  return { uri, nome: 'salto.mp4', duracaoS: 4, fpsLido, fpsDoArquivo: fpsLido, temporario };
}

/** Congela o objeto para provar que as funções não o alteram. */
function congelada(t: TentativaEmAndamento): TentativaEmAndamento {
  return Object.freeze({ ...t, marcas: Object.freeze({ ...t.marcas }) });
}

describe('pernasDoProtocolo e criarTentativasVazias', () => {
  it.each(['cmj_bi', 'sj', 'dj'] as const)('%s: uma perna, 3 tentativas vazias', (protocolo) => {
    expect(pernasDoProtocolo(protocolo)).toEqual(['unica']);
    expect(criarTentativasVazias(protocolo)).toEqual({ unica: [VAZIA, VAZIA, VAZIA] });
  });

  it.each(['cmj_uni', 'dj_uni'] as const)('%s: direita e esquerda, 3 cada', (protocolo) => {
    expect(pernasDoProtocolo(protocolo)).toEqual(['direita', 'esquerda']);
    const tentativas = criarTentativasVazias(protocolo);
    expect(tentativas.direita).toHaveLength(3);
    expect(tentativas.esquerda).toHaveLength(3);
    expect(tentativas.unica).toBeUndefined();
  });

  it('agachamento fica fora (série única da spec 014)', () => {
    expect(pernasDoProtocolo('agach')).toEqual([]);
    expect(criarTentativasVazias('agach')).toEqual({});
  });

  it('as tentativas são objetos independentes', () => {
    const { unica } = criarTentativasVazias('cmj_bi');
    expect(unica?.[0]).not.toBe(unica?.[1]);
  });
});

describe('transições da tentativa', () => {
  it('definirVideo pré-seleciona o FPS lido, zera a confirmação e as marcas', () => {
    const anterior = congelada({
      video: video('a', 120),
      fpsSelecionado: 120,
      fpsConfirmado: 120,
      marcas: { decolagem: 10 },
    });
    const nova = definirVideo(anterior, video('b', 240));
    expect(nova).toEqual({
      video: video('b', 240),
      fpsSelecionado: 240,
      fpsConfirmado: null,
      marcas: {},
    });
  });

  it('definirVideo sem FPS lido deixa o seletor sem seleção', () => {
    expect(definirVideo(VAZIA, video('a', null)).fpsSelecionado).toBeNull();
  });

  it('selecionarFps troca a seleção sem confirmar', () => {
    const t = selecionarFps(congelada(definirVideo(VAZIA, video('a', null))), 120);
    expect(t.fpsSelecionado).toBe(120);
    expect(t.fpsConfirmado).toBeNull();
  });

  it('confirmarFps confirma a seleção', () => {
    const t = confirmarFps(congelada(definirVideo(VAZIA, video('a', 240))));
    expect(t.fpsConfirmado).toBe(240);
    expect(marcacoesLiberadas(t)).toBe(true);
  });

  it('confirmarFps não tem efeito sem seleção ou abaixo de 60', () => {
    const semSelecao = congelada(definirVideo(VAZIA, video('a', null)));
    expect(confirmarFps(semSelecao)).toEqual(semSelecao);
    const trinta = congelada(definirVideo(VAZIA, video('a', 30)));
    expect(confirmarFps(trinta)).toEqual(trinta);
  });

  it('trocarFps volta ao seletor, mantendo a seleção e as marcas', () => {
    const confirmada = congelada({
      video: video('a', 240),
      fpsSelecionado: 240,
      fpsConfirmado: 240,
      marcas: { decolagem: 300 },
    });
    const t = trocarFps(confirmada);
    expect(t).toEqual({ ...confirmada, fpsConfirmado: null });
    expect(marcacoesLiberadas(t)).toBe(false);
  });

  it('marcacoesLiberadas só com FPS confirmado', () => {
    expect(marcacoesLiberadas(VAZIA)).toBe(false);
    expect(marcacoesLiberadas(definirVideo(VAZIA, video('a', 240)))).toBe(false);
  });
});

describe('videosTemporarios', () => {
  it('devolve as URIs únicas só dos vídeos temporários', () => {
    const comVideo = (v: VideoSelecionado) => definirVideo(VAZIA, v);
    const tentativas: TentativasPorPerna = {
      direita: [comVideo(video('a', 240)), comVideo(video('a', 240)), VAZIA],
      esquerda: [comVideo(video('b', 240)), comVideo(video('galeria', 240, false)), VAZIA],
    };
    expect(videosTemporarios(tentativas).sort()).toEqual(['a', 'b']);
  });

  it('sem vídeos devolve lista vazia', () => {
    expect(videosTemporarios(criarTentativasVazias('cmj_uni'))).toEqual([]);
  });
});
