import type { Attempt, NumeroTentativa, PernaTentativa } from '@/types/attempt';
import type { MedidaTentativa } from '@/types/resultadoSalto';
import {
  alturaCm,
  calcularLsi,
  calcularResultadoSalto,
  calcularRsi,
  corLsi,
  margemAlturaCm,
  mediaDasTentativas,
  medirTentativa,
  tempoS,
} from '@/utils/biomechanics';

// Valores esperados calculados à mão (research R2 da spec 007), com g = 9,81 m/s².

function tentativa(dados: Partial<Attempt>): Attempt {
  return {
    perna: 'unica',
    numero: 1,
    fps: 240,
    quadroToque: null,
    quadroDecolagem: 1000,
    quadroAterrissagem: 1120,
    ...dados,
  };
}

/** Medida pronta com a altura pedida, para testar médias e LSI sem passar pelos quadros. */
function medidaComAltura(altura: number, fps = 240): MedidaTentativa {
  return {
    alturaCm: altura,
    tempoVooMs: 0,
    tempoContatoMs: null,
    rsi: null,
    margemCm: 0,
    fps,
    baixaPrecisao: fps <= 60,
  };
}

/** Três tentativas de uma perna com o mesmo tempo de voo (quadros de decolagem e aterrissagem). */
function serie(
  perna: PernaTentativa,
  quadrosDeVoo: number,
  fps = 240,
  extra: Partial<Attempt> = {},
) {
  return ([1, 2, 3] as NumeroTentativa[]).map((numero) =>
    tentativa({
      perna,
      numero,
      fps,
      quadroDecolagem: 0,
      quadroAterrissagem: quadrosDeVoo,
      ...extra,
    }),
  );
}

describe('tempoS', () => {
  it('120 quadros a 240 fps dão 0,5 s', () => {
    expect(tempoS(0, 120, 240)).toBe(0.5);
    expect(tempoS(1000, 1120, 240)).toBe(0.5);
  });

  it('quadros iguais dão 0', () => {
    expect(tempoS(50, 50, 240)).toBe(0);
  });

  it.each([0, -240, Number.NaN, Number.POSITIVE_INFINITY])('FPS %p lança RangeError', (fps) => {
    expect(() => tempoS(0, 120, fps)).toThrow(RangeError);
  });

  it('quadro final menor que o inicial lança RangeError', () => {
    expect(() => tempoS(120, 0, 240)).toThrow(RangeError);
  });
});

describe('alturaCm e margemAlturaCm', () => {
  it('CA01: 0,5 s de voo dão 30,65625 cm, com margem de 0,5109375 cm a 240 fps', () => {
    expect(alturaCm(0.5)).toBeCloseTo(30.65625, 10);
    expect(margemAlturaCm(0.5, 240)).toBeCloseTo(0.5109375, 10);
  });

  it('voo zero dá altura e margem zero', () => {
    expect(alturaCm(0)).toBe(0);
    expect(margemAlturaCm(0, 240)).toBe(0);
  });

  it.each([0, -60, Number.NaN, Number.POSITIVE_INFINITY])(
    'margem com FPS %p lança RangeError',
    (fps) => {
      expect(() => margemAlturaCm(0.5, fps)).toThrow(RangeError);
    },
  );

  it('a margem cai com o FPS: a 60 fps é 4 vezes a de 240', () => {
    expect(margemAlturaCm(0.5, 60)).toBeCloseTo(4 * margemAlturaCm(0.5, 240), 10);
  });
});

describe('calcularRsi', () => {
  it('19,62 cm com 0,2 s de contato dão 0,981', () => {
    expect(calcularRsi(19.62, 0.2)).toBeCloseTo(0.981, 10);
  });

  it.each([0, -0.1])('contato %p dá null', (contato) => {
    expect(calcularRsi(19.62, contato)).toBeNull();
  });
});

describe('calcularLsi', () => {
  it('CA03: 25 e 30 dão 83,333...%', () => {
    expect(calcularLsi(25, 30)).toBeCloseTo(83.3333333, 6);
  });

  it('CA04: 27 e 30 dão 90%', () => {
    expect(calcularLsi(27, 30)).toBeCloseTo(90, 10);
  });

  it.each([0, -1])('referência %p dá null', (referencia) => {
    expect(calcularLsi(25, referencia)).toBeNull();
  });
});

describe('corLsi (faixas da D12 sobre o valor exibido com 1 casa)', () => {
  it.each([
    [79.9, 'vermelho'],
    [80, 'amarelo'],
    [89.94, 'amarelo'],
    [89.96, 'verde'],
    [90, 'verde'],
    [120, 'verde'],
    [null, 'neutro'],
  ] as const)('%p é %s', (valor, cor) => {
    expect(corLsi(valor)).toBe(cor);
  });

  it('CA03 é amarelo e CA04 é verde', () => {
    expect(corLsi(calcularLsi(25, 30))).toBe('amarelo');
    expect(corLsi(calcularLsi(27, 30))).toBe('verde');
  });
});

describe('medirTentativa', () => {
  it('CA01: CMJ a 240 fps, decolagem 1000 e aterrissagem 1120, sem arredondar', () => {
    const medida = medirTentativa(tentativa({}), false);
    expect(medida.tempoVooMs).toBeCloseTo(500, 10);
    expect(medida.alturaCm).toBeCloseTo(30.65625, 10);
    expect(medida.margemCm).toBeCloseTo(0.5109375, 10);
    expect(medida.tempoContatoMs).toBeNull();
    expect(medida.rsi).toBeNull();
    expect(medida.fps).toBe(240);
    expect(medida.baixaPrecisao).toBe(false);
  });

  it('quadros iguais dão voo, altura e margem zero', () => {
    const medida = medirTentativa(tentativa({ quadroAterrissagem: 1000 }), false);
    expect(medida.tempoVooMs).toBe(0);
    expect(medida.alturaCm).toBe(0);
    expect(medida.margemCm).toBe(0);
  });

  it('baixa precisão a 60 fps, não a 120 e 240', () => {
    expect(
      medirTentativa(tentativa({ fps: 60, quadroAterrissagem: 1030 }), false).baixaPrecisao,
    ).toBe(true);
    expect(medirTentativa(tentativa({ fps: 120 }), false).baixaPrecisao).toBe(false);
    expect(medirTentativa(tentativa({ fps: 240 }), false).baixaPrecisao).toBe(false);
  });

  it('CA02: Drop Jump a 240 fps, toque 500, decolagem 548, aterrissagem 644', () => {
    const medida = medirTentativa(
      tentativa({ quadroToque: 500, quadroDecolagem: 548, quadroAterrissagem: 644 }),
      true,
    );
    expect(medida.tempoContatoMs).toBeCloseTo(200, 10);
    expect(medida.tempoVooMs).toBeCloseTo(400, 10);
    expect(medida.alturaCm).toBeCloseTo(19.62, 10);
    expect(medida.rsi).toBeCloseTo(0.981, 10);
  });

  it('Drop Jump sem o quadro do toque lança RangeError', () => {
    expect(() => medirTentativa(tentativa({ quadroToque: null }), true)).toThrow(RangeError);
  });

  it('Drop Jump com toque igual à decolagem dá contato 0 e RSI nulo', () => {
    const medida = medirTentativa(
      tentativa({ quadroToque: 548, quadroDecolagem: 548, quadroAterrissagem: 644 }),
      true,
    );
    expect(medida.tempoContatoMs).toBe(0);
    expect(medida.rsi).toBeNull();
  });
});

describe('mediaDasTentativas', () => {
  it('CA06 (parte): alturas 24,83, 25,76 e 26,71 dão 25,7666...', () => {
    const resumo = mediaDasTentativas([24.83, 25.76, 26.71].map((h) => medidaComAltura(h)));
    expect(resumo.alturaCm).toBeCloseTo(25.7666667, 6);
    expect(resumo.tentativas.map((t) => t.alturaCm)).toEqual([24.83, 25.76, 26.71]);
  });

  it('tira a média do voo e da margem, e lista os FPS distintos', () => {
    const medidas = [
      medirTentativa(tentativa({ quadroAterrissagem: 1120 }), false),
      medirTentativa(tentativa({ quadroAterrissagem: 1096 }), false),
      medirTentativa(tentativa({ fps: 120, quadroAterrissagem: 1060 }), false),
    ];
    const resumo = mediaDasTentativas(medidas);
    expect(resumo.tempoVooMs).toBeCloseTo((500 + 400 + 500) / 3, 10);
    expect(resumo.margemCm).toBeCloseTo(
      (medidas[0].margemCm + medidas[1].margemCm + medidas[2].margemCm) / 3,
      10,
    );
    expect(resumo.fps).toEqual([240, 120]);
    expect(resumo.baixaPrecisao).toBe(false);
  });

  it('baixa precisão se uma das três for a 60 fps', () => {
    const resumo = mediaDasTentativas([
      medidaComAltura(30),
      medidaComAltura(30, 60),
      medidaComAltura(30),
    ]);
    expect(resumo.baixaPrecisao).toBe(true);
  });

  it('Drop Jump: média do contato e do RSI; null se algum for null', () => {
    const dj = (toque: number) =>
      medirTentativa(
        tentativa({ quadroToque: toque, quadroDecolagem: 548, quadroAterrissagem: 644 }),
        true,
      );
    const resumo = mediaDasTentativas([dj(500), dj(512), dj(524)]);
    expect(resumo.tempoContatoMs).toBeCloseTo((200 + 150 + 100) / 3, 10);
    expect(resumo.rsi).toBeCloseTo((0.981 + 19.62 / 100 / 0.15 + 19.62 / 100 / 0.1) / 3, 10);

    const comNulo = mediaDasTentativas([dj(500), dj(548), dj(524)]);
    expect(comNulo.rsi).toBeNull();
    expect(comNulo.tempoContatoMs).toBeCloseTo((200 + 0 + 100) / 3, 10);
  });

  it('lista vazia lança RangeError', () => {
    expect(() => mediaDasTentativas([])).toThrow(RangeError);
  });
});

describe('calcularResultadoSalto', () => {
  // 120 quadros a 240 fps = 0,5 s de voo = 30,65625 cm.
  const ALTURA_120 = 30.65625;

  it('bilateral: só a perna única e sem LSI', () => {
    const resultado = calcularResultadoSalto(serie('unica', 120), {
      ehDropJump: false,
      pernaLesionada: 'direita',
    });
    expect(Object.keys(resultado.pernas)).toEqual(['unica']);
    expect(resultado.pernas.unica?.alturaCm).toBeCloseTo(ALTURA_120, 10);
    expect(resultado.lsi).toBeNull();
    expect(resultado.baixaPrecisao).toBe(false);
  });

  it('CMJ unilateral com a direita lesionada: LSI pela altura, lesionada / sadia', () => {
    const tentativas = [...serie('direita', 108), ...serie('esquerda', 120)];
    const resultado = calcularResultadoSalto(tentativas, {
      ehDropJump: false,
      pernaLesionada: 'direita',
    });
    const direita = resultado.pernas.direita?.alturaCm ?? NaN;
    const esquerda = resultado.pernas.esquerda?.alturaCm ?? NaN;
    expect(resultado.lsi).toEqual({
      valor: expect.closeTo((direita / esquerda) * 100, 10),
      base: 'altura',
      modo: 'lesionada',
      pernaMaisFraca: null,
    });
    // 108/120 de voo: altura proporcional ao quadrado, LSI = 0,81 x 100.
    expect(resultado.lsi?.valor).toBeCloseTo(81, 10);
  });

  it('com a esquerda lesionada, o numerador é a esquerda', () => {
    const tentativas = [...serie('direita', 120), ...serie('esquerda', 108)];
    const resultado = calcularResultadoSalto(tentativas, {
      ehDropJump: false,
      pernaLesionada: 'esquerda',
    });
    expect(resultado.lsi?.valor).toBeCloseTo(81, 10);
  });

  it('Drop Jump unilateral: LSI pelo RSI', () => {
    const direita = serie('direita', 144, 240, {
      quadroToque: 0,
      quadroDecolagem: 48,
      quadroAterrissagem: 144,
    });
    const esquerda = serie('esquerda', 144, 240, {
      quadroToque: 12,
      quadroDecolagem: 48,
      quadroAterrissagem: 144,
    });
    const resultado = calcularResultadoSalto([...direita, ...esquerda], {
      ehDropJump: true,
      pernaLesionada: 'direita',
    });
    // Mesma altura, contato 200 ms x 150 ms: RSI direita / esquerda = 150 / 200.
    expect(resultado.lsi?.base).toBe('rsi');
    expect(resultado.lsi?.valor).toBeCloseTo(75, 10);
  });

  it('sem tentativas, não há pernas nem LSI', () => {
    const resultado = calcularResultadoSalto([], { ehDropJump: false, pernaLesionada: 'nenhuma' });
    expect(resultado).toEqual({ pernas: {}, lsi: null, baixaPrecisao: false });
  });

  it('sem perna lesionada: a mais fraca / a mais forte, nos dois sentidos', () => {
    // 100 e 120 quadros de voo: a altura é proporcional ao quadrado do voo.
    const tentativas = [...serie('direita', 100), ...serie('esquerda', 120)];
    const comPernas = calcularResultadoSalto(tentativas, {
      ehDropJump: false,
      pernaLesionada: 'nenhuma',
    });
    expect(comPernas.lsi).toEqual({
      valor: expect.closeTo((100 / 120) ** 2 * 100, 10),
      base: 'altura',
      modo: 'mais_fraca',
      pernaMaisFraca: 'direita',
    });

    const invertido = calcularResultadoSalto(
      [...serie('direita', 120), ...serie('esquerda', 100)],
      {
        ehDropJump: false,
        pernaLesionada: 'nenhuma',
      },
    );
    expect(invertido.lsi?.pernaMaisFraca).toBe('esquerda');
    expect(invertido.lsi?.valor).toBeCloseTo((100 / 120) ** 2 * 100, 10);
  });

  it('empate sem perna lesionada dá 100% e a direita como mais fraca', () => {
    const resultado = calcularResultadoSalto(
      [...serie('direita', 120), ...serie('esquerda', 120)],
      {
        ehDropJump: false,
        pernaLesionada: 'nenhuma',
      },
    );
    expect(resultado.lsi?.valor).toBeCloseTo(100, 10);
    expect(resultado.lsi?.pernaMaisFraca).toBe('direita');
  });

  it('Drop Jump unilateral com uma perna sem RSI (contato zero) conta essa perna como zero', () => {
    const direita = serie('direita', 144, 240, {
      quadroToque: 48,
      quadroDecolagem: 48,
      quadroAterrissagem: 144,
    });
    const esquerda = serie('esquerda', 144, 240, {
      quadroToque: 0,
      quadroDecolagem: 48,
      quadroAterrissagem: 144,
    });
    const lesionadaSemRsi = calcularResultadoSalto([...direita, ...esquerda], {
      ehDropJump: true,
      pernaLesionada: 'direita',
    });
    expect(lesionadaSemRsi.lsi?.valor).toBe(0);
    const sadiaSemRsi = calcularResultadoSalto([...direita, ...esquerda], {
      ehDropJump: true,
      pernaLesionada: 'esquerda',
    });
    expect(sadiaSemRsi.lsi?.valor).toBeNull();
  });

  it('perna de referência com zero dá LSI nulo', () => {
    const resultado = calcularResultadoSalto([...serie('direita', 120), ...serie('esquerda', 0)], {
      ehDropJump: false,
      pernaLesionada: 'direita',
    });
    expect(resultado.lsi?.valor).toBeNull();
  });

  it('baixa precisão se alguma tentativa de qualquer perna for a 60 fps', () => {
    const tentativas = [...serie('direita', 120), ...serie('esquerda', 30, 60)];
    const resultado = calcularResultadoSalto(tentativas, {
      ehDropJump: false,
      pernaLesionada: 'direita',
    });
    expect(resultado.baixaPrecisao).toBe(true);
    expect(resultado.pernas.direita?.baixaPrecisao).toBe(false);
    expect(resultado.pernas.esquerda?.baixaPrecisao).toBe(true);
  });

  it('as tentativas de cada perna ficam na ordem 1, 2, 3', () => {
    const fora = [3, 1, 2].map((numero) =>
      tentativa({
        numero: numero as NumeroTentativa,
        quadroDecolagem: 0,
        quadroAterrissagem: 100 + numero,
      }),
    );
    const resultado = calcularResultadoSalto(fora, {
      ehDropJump: false,
      pernaLesionada: 'nenhuma',
    });
    const voos = resultado.pernas.unica?.tentativas.map((t) => t.tempoVooMs) ?? [];
    expect(voos).toEqual([...voos].sort((a, b) => a - b));
  });
});

describe('CA06 completa: médias por perna e LSI', () => {
  it('lesionada 24,83 / 25,76 / 26,71; sadia 28,65 / 29,64 / 30,66; LSI 86,903...%', () => {
    const lesionada = mediaDasTentativas([24.83, 25.76, 26.71].map((h) => medidaComAltura(h)));
    const sadia = mediaDasTentativas([28.65, 29.64, 30.66].map((h) => medidaComAltura(h)));
    expect(lesionada.alturaCm).toBeCloseTo(25.7666667, 6);
    expect(sadia.alturaCm).toBeCloseTo(29.65, 10);
    const lsi = calcularLsi(lesionada.alturaCm, sadia.alturaCm);
    expect(lsi).toBeCloseTo(86.9028, 3);
    expect(corLsi(lsi)).toBe('amarelo');
  });
});
