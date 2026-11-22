import type { TentativaEmAndamento, TentativasPorPerna, VideoSelecionado } from '@/types/attempt';
import {
  confirmarFps,
  marcarNaTentativa,
  tentativasConcluidas,
  usarVideoDaAnterior,
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

  it('agachamento não tem pernas e usa uma tentativa única para o vídeo da série (spec 014)', () => {
    expect(pernasDoProtocolo('agach')).toEqual([]);
    expect(criarTentativasVazias('agach')).toEqual({ unica: [VAZIA] });
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

describe('marcarNaTentativa', () => {
  it('troca as marcas sem alterar o resto nem o objeto recebido', () => {
    const t = congelada(confirmarFps(definirVideo(VAZIA, video('a', 240))));
    const marcada = marcarNaTentativa(t, { decolagem: 1000 });
    expect(marcada).toEqual({ ...t, marcas: { decolagem: 1000 } });
    expect(t.marcas).toEqual({});
  });
});

describe('usarVideoDaAnterior', () => {
  it('copia vídeo e FPS confirmado da anterior, sem as marcações', () => {
    const anterior = congelada({
      video: video('a', 240),
      fpsSelecionado: 240,
      fpsConfirmado: 240,
      marcas: { decolagem: 1000, aterrissagem: 1120 },
    });
    const atual = congelada({ ...VAZIA, marcas: { decolagem: 5 } });
    expect(usarVideoDaAnterior(anterior, atual)).toEqual({
      video: video('a', 240),
      fpsSelecionado: 240,
      fpsConfirmado: 240,
      marcas: {},
    });
  });
});

describe('tentativasConcluidas', () => {
  function completa(marcas: TentativaEmAndamento['marcas'], fps = 240): TentativaEmAndamento {
    return { video: video('a', fps), fpsSelecionado: fps, fpsConfirmado: fps, marcas };
  }

  it('bilateral: três Attempt numeradas de 1 a 3, sem toque fora do Drop Jump', () => {
    const tentativas: TentativasPorPerna = {
      unica: [
        completa({ decolagem: 1000, aterrissagem: 1120 }),
        completa({ decolagem: 2000, aterrissagem: 2110 }),
        completa({ decolagem: 3000, aterrissagem: 3100 }, 120),
      ],
    };
    expect(tentativasConcluidas(tentativas, 'cmj_bi')).toEqual([
      {
        perna: 'unica',
        numero: 1,
        fps: 240,
        quadroToque: null,
        quadroDecolagem: 1000,
        quadroAterrissagem: 1120,
      },
      {
        perna: 'unica',
        numero: 2,
        fps: 240,
        quadroToque: null,
        quadroDecolagem: 2000,
        quadroAterrissagem: 2110,
      },
      {
        perna: 'unica',
        numero: 3,
        fps: 120,
        quadroToque: null,
        quadroDecolagem: 3000,
        quadroAterrissagem: 3100,
      },
    ]);
  });

  it('Drop Jump unilateral: seis Attempt com o quadro do toque', () => {
    const dj = completa({ toque: 500, decolagem: 548, aterrissagem: 644 });
    const concluidas = tentativasConcluidas(
      { direita: [dj, dj, dj], esquerda: [dj, dj, dj] },
      'dj_uni',
    );
    expect(concluidas).toHaveLength(6);
    expect(concluidas.map((a) => `${a.perna}-${a.numero}`)).toEqual([
      'direita-1',
      'direita-2',
      'direita-3',
      'esquerda-1',
      'esquerda-2',
      'esquerda-3',
    ]);
    expect(concluidas.every((a) => a.quadroToque === 500)).toBe(true);
  });

  it('lança erro com alguma tentativa incompleta', () => {
    const tentativas: TentativasPorPerna = {
      unica: [
        completa({ decolagem: 1000, aterrissagem: 1120 }),
        completa({ decolagem: 1000 }),
        VAZIA,
      ],
    };
    expect(() => tentativasConcluidas(tentativas, 'cmj_bi')).toThrow(Error);
  });
});
