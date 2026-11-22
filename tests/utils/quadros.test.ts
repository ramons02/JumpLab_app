import type { VideoSelecionado } from '@/types/attempt';
import {
  fpsDeNavegacao,
  limitarQuadro,
  podeAvancar,
  podeVoltar,
  posicaoNoArquivoS,
  quadroDaBarra,
  quadroNaPosicao,
  totalDeQuadros,
} from '@/utils/quadros';

function video(fpsDoArquivo: number | null): VideoSelecionado {
  return {
    uri: 'file:///v.mp4',
    nome: 'v.mp4',
    duracaoS: 3,
    fpsLido: 240,
    fpsDoArquivo,
    temporario: false,
  };
}

describe('fpsDeNavegacao', () => {
  it('usa a taxa do arquivo', () => {
    expect(fpsDeNavegacao(video(30), 240)).toBe(30);
  });

  it('sem taxa do arquivo, cai no FPS confirmado', () => {
    expect(fpsDeNavegacao(video(null), 240)).toBe(240);
  });

  it('sem nenhuma das duas, devolve null', () => {
    expect(fpsDeNavegacao(video(null), null)).toBeNull();
  });

  it('ignora taxa inválida', () => {
    expect(fpsDeNavegacao(video(0), null)).toBeNull();
    expect(fpsDeNavegacao(video(Number.NaN), 120)).toBe(120);
  });
});

describe('totalDeQuadros', () => {
  it('3,0 s a 240 fps dá 720 quadros', () => {
    expect(totalDeQuadros(3, 240)).toBe(720);
  });

  it('40,0 s a 30 fps dá 1200 quadros', () => {
    expect(totalDeQuadros(40, 30)).toBe(1200);
  });

  it('duração 0 dá 1 quadro', () => {
    expect(totalDeQuadros(0, 240)).toBe(1);
  });

  it('não perde o último quadro por arredondamento da duração', () => {
    expect(totalDeQuadros(0.1 + 0.2, 10)).toBe(3);
    expect(totalDeQuadros(1199 / 240 + 1 / 240, 240)).toBe(1200);
  });

  it('taxa inválida dá 1 quadro', () => {
    expect(totalDeQuadros(3, 0)).toBe(1);
  });
});

describe('posicaoNoArquivoS', () => {
  it('quadro 120 a 240 fps fica no meio do quadro', () => {
    expect(posicaoNoArquivoS(120, 240)).toBeCloseTo(0.502083, 6);
  });

  it('quadro 120 a 30 fps', () => {
    expect(posicaoNoArquivoS(120, 30)).toBeCloseTo(4.016667, 6);
  });
});

describe('quadroNaPosicao', () => {
  it('devolve o quadro inteiro da posição', () => {
    expect(quadroNaPosicao(0.502083, 240, 720)).toBe(120);
    expect(quadroNaPosicao(0.5, 240, 720)).toBe(120);
  });

  it('é limitado a 0 e ao último', () => {
    expect(quadroNaPosicao(-1, 240, 720)).toBe(0);
    expect(quadroNaPosicao(10, 240, 720)).toBe(719);
  });
});

describe('quadroDaBarra', () => {
  it('50% de uma barra com 720 quadros dá 360', () => {
    expect(quadroDaBarra(150, 300, 720)).toBe(360);
  });

  it('fora da barra é limitado', () => {
    expect(quadroDaBarra(-20, 300, 720)).toBe(0);
    expect(quadroDaBarra(300, 300, 720)).toBe(719);
    expect(quadroDaBarra(500, 300, 720)).toBe(719);
  });

  it('barra sem largura dá o primeiro quadro', () => {
    expect(quadroDaBarra(10, 0, 720)).toBe(0);
  });
});

describe('limitarQuadro', () => {
  it('mantém um quadro válido', () => {
    expect(limitarQuadro(5, 10)).toBe(5);
  });

  it('limita às pontas e arredonda', () => {
    expect(limitarQuadro(-3, 10)).toBe(0);
    expect(limitarQuadro(42, 10)).toBe(9);
    expect(limitarQuadro(4.6, 10)).toBe(5);
    expect(limitarQuadro(Number.NaN, 10)).toBe(0);
  });
});

describe('podeVoltar e podeAvancar', () => {
  it('no primeiro quadro só avança', () => {
    expect(podeVoltar(0)).toBe(false);
    expect(podeAvancar(0, 720)).toBe(true);
  });

  it('no último quadro só volta', () => {
    expect(podeVoltar(719)).toBe(true);
    expect(podeAvancar(719, 720)).toBe(false);
  });

  it('com um único quadro, nenhum dos dois', () => {
    expect(podeVoltar(0)).toBe(false);
    expect(podeAvancar(0, 1)).toBe(false);
  });
});
