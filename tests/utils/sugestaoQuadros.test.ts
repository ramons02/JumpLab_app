import type { AlturaDosPes, PontoImagem, PontosDoQuadro } from '@/types/sugestao';
import {
  ajusteDaSugestao,
  alturasDosPes,
  janelasDeRefino,
  JANELA_REFINO_QUADROS,
  MAXIMO_QUADROS_ANALISE,
  MOTIVO_PES_INSUFICIENTES,
  MOTIVO_SEM_SALTO,
  MOTIVO_SEM_TOQUE,
  quadrosDaPassadaGrossa,
  sugerirQuadrosPelosPes,
  textoDoAjuste,
} from '@/utils/sugestaoQuadros';

const CHAO = 0.9;
const AR = 0.7;
const CAIXA = 0.6;

/** Série com `yPe` dado por quadro e perna de 0,4 (margem de 0,016). */
function serie(total: number, yPe: (quadro: number) => number | null): AlturaDosPes[] {
  return Array.from({ length: total }, (_, quadro) => ({ quadro, yPe: yPe(quadro), perna: 0.4 }));
}

/** CMJ: chão até 299, ar de 300 a 419, chão a partir de 420 (CA01). */
const cmj = (q: number) => (q >= 300 && q < 420 ? AR : CHAO);

/** Drop Jump: caixa até 99, queda de 100 a 149, chão de 150 a 199, ar de 200 a 279, chão depois. */
function dropJump(q: number) {
  if (q < 100) return CAIXA;
  if (q < 150) return CAIXA + ((q - 100) / 50) * 0.05;
  if (q < 200) return CHAO;
  if (q < 280) return AR;
  return CHAO;
}

function ponto(y: number, visibilidade = 0.9): PontoImagem {
  return { x: 0.5, y, visibilidade };
}

function quadroComPes(
  quadro: number,
  yEsquerdo: number,
  yDireito: number,
  opcoes: { visibilidade?: number; semQuadris?: boolean } = {},
): PontosDoQuadro {
  const v = opcoes.visibilidade ?? 0.9;
  return {
    quadro,
    pes: {
      esquerdo: [ponto(yEsquerdo - 0.02, v), ponto(yEsquerdo - 0.01, v), ponto(yEsquerdo, v)],
      direito: [ponto(yDireito - 0.02, v), ponto(yDireito - 0.01, v), ponto(yDireito, v)],
    },
    quadris: opcoes.semQuadris ? null : { esquerdo: ponto(0.5), direito: ponto(0.5) },
  };
}

describe('alturasDosPes', () => {
  it('bilateral usa o ponto mais baixo dos dois pés e a perna entre quadris e tornozelos', () => {
    const [a] = alturasDosPes([quadroComPes(7, 0.8, 0.9)], 'unica');
    expect(a.quadro).toBe(7);
    expect(a.yPe).toBeCloseTo(0.9);
    // tornozelos em 0,78 e 0,88 (média 0,83), quadris em 0,5
    expect(a.perna).toBeCloseTo(0.33);
  });

  it('unilateral direita ignora o pé esquerdo', () => {
    const [a] = alturasDosPes([quadroComPes(0, 0.95, 0.7)], 'direita');
    expect(a.yPe).toBeCloseTo(0.7);
    const [b] = alturasDosPes([quadroComPes(0, 0.95, 0.7)], 'esquerda');
    expect(b.yPe).toBeCloseTo(0.95);
  });

  it('ignora ponto com visibilidade abaixo de 0,5', () => {
    const quadro = quadroComPes(0, 0.8, 0.9);
    quadro.pes!.direito = quadro.pes!.direito.map((p) => ({ ...p, visibilidade: 0.4 }));
    expect(alturasDosPes([quadro], 'unica')[0].yPe).toBeCloseTo(0.8);
    expect(alturasDosPes([quadro], 'direita')[0].yPe).toBeNull();
  });

  it('sem pessoa ou sem quadris', () => {
    expect(alturasDosPes([{ quadro: 3, pes: null, quadris: null }], 'unica')).toEqual([
      { quadro: 3, yPe: null, perna: null },
    ]);
    expect(alturasDosPes([quadroComPes(0, 0.8, 0.8, { semQuadris: true })], 'unica')[0].perna).toBe(
      null,
    );
  });
});

describe('sugerirQuadrosPelosPes', () => {
  it('CMJ: decolagem no 300 e aterrissagem no 420 (CA01)', () => {
    expect(sugerirQuadrosPelosPes(serie(600, cmj), false)).toEqual({
      tipo: 'pronta',
      quadros: { decolagem: 300, aterrissagem: 420 },
    });
  });

  it('oscilação de 1 e 2 quadros não vira evento', () => {
    const ruido = new Set([100, 150, 151, 350, 351]);
    const comRuido = serie(600, (q) => (ruido.has(q) ? (cmj(q) === CHAO ? AR : CHAO) : cmj(q)));
    expect(sugerirQuadrosPelosPes(comRuido, false)).toEqual({
      tipo: 'pronta',
      quadros: { decolagem: 300, aterrissagem: 420 },
    });
  });

  it('Drop Jump começando na caixa: toque, decolagem e aterrissagem em ordem', () => {
    expect(sugerirQuadrosPelosPes(serie(400, dropJump), true)).toEqual({
      tipo: 'pronta',
      quadros: { toque: 150, decolagem: 200, aterrissagem: 280 },
    });
  });

  it('unilateral: o pé livre no ar não conta', () => {
    const pontos = Array.from({ length: 600 }, (_, q) => quadroComPes(q, AR, cmj(q)));
    expect(sugerirQuadrosPelosPes(alturasDosPes(pontos, 'direita'), false)).toEqual({
      tipo: 'pronta',
      quadros: { decolagem: 300, aterrissagem: 420 },
    });
  });

  it('pés em menos de 60% dos quadros: falha com o motivo', () => {
    const cortada = serie(600, (q) => (q % 2 === 0 ? null : cmj(q)));
    expect(sugerirQuadrosPelosPes(cortada, false)).toEqual({
      tipo: 'falhou',
      motivo: MOTIVO_PES_INSUFICIENTES,
    });
  });

  it('menos de 10 quadros com pés: falha', () => {
    expect(
      sugerirQuadrosPelosPes(
        serie(9, () => CHAO),
        false,
      ),
    ).toEqual({
      tipo: 'falhou',
      motivo: MOTIVO_PES_INSUFICIENTES,
    });
  });

  it('sem salto: "Não achei a decolagem e a aterrissagem no vídeo."', () => {
    expect(
      sugerirQuadrosPelosPes(
        serie(300, () => CHAO),
        false,
      ),
    ).toEqual({
      tipo: 'falhou',
      motivo: MOTIVO_SEM_SALTO,
    });
  });

  it('decolagem sem volta ao chão também é falha', () => {
    expect(
      sugerirQuadrosPelosPes(
        serie(400, (q) => (q < 300 ? CHAO : AR)),
        false,
      ),
    ).toEqual({
      tipo: 'falhou',
      motivo: MOTIVO_SEM_SALTO,
    });
  });

  it('Drop Jump sem toque: "Não achei o toque no solo depois da queda da caixa."', () => {
    expect(
      sugerirQuadrosPelosPes(
        serie(300, () => CHAO),
        true,
      ),
    ).toEqual({
      tipo: 'falhou',
      motivo: MOTIVO_SEM_TOQUE,
    });
  });

  it('sem quadris usa o comprimento padrão da perna (margem de 0,01)', () => {
    // salto de só 0,012 acima do chão: com perna 0,4 (margem 0,016) não sai do chão; com 0,25 sai.
    const baixo = (q: number) => (q >= 300 && q < 420 ? CHAO - 0.012 : CHAO);
    const comPerna = serie(600, baixo);
    const semPerna = comPerna.map((q) => ({ ...q, perna: null }));
    expect(sugerirQuadrosPelosPes(comPerna, false).tipo).toBe('falhou');
    expect(sugerirQuadrosPelosPes(semPerna, false)).toEqual({
      tipo: 'pronta',
      quadros: { decolagem: 300, aterrissagem: 420 },
    });
  });

  it('a mesma entrada dá sempre a mesma saída, em qualquer ordem', () => {
    const s = serie(600, cmj);
    const primeira = sugerirQuadrosPelosPes(s, false);
    expect(sugerirQuadrosPelosPes([...s].reverse(), false)).toEqual(primeira);
    expect(sugerirQuadrosPelosPes(s, false)).toEqual(primeira);
  });
});

describe('quadrosDaPassadaGrossa', () => {
  it('2400 quadros a 240 fps: 600 quadros com passo 4', () => {
    const q = quadrosDaPassadaGrossa(2400, 240);
    expect(q).toHaveLength(600);
    expect(q.slice(0, 3)).toEqual([0, 4, 8]);
    expect(q.at(-1)).toBe(2396);
  });

  it('a 60 fps o passo é 1', () => {
    expect(quadrosDaPassadaGrossa(10, 60)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('nunca passa do teto de quadros', () => {
    expect(quadrosDaPassadaGrossa(20000, 60).length).toBeLessThanOrEqual(MAXIMO_QUADROS_ANALISE);
    expect(quadrosDaPassadaGrossa(0, 240)).toEqual([]);
  });
});

describe('janelasDeRefino', () => {
  const grossa = (yPe: (q: number) => number | null, total: number, fps: number) =>
    quadrosDaPassadaGrossa(total, fps).map((quadro) => ({ quadro, yPe: yPe(quadro), perna: 0.4 }));

  it('lê 12 quadros de cada lado de cada mudança, sem repetir nem reler a passada grossa', () => {
    const quadros = janelasDeRefino(grossa(cmj, 2400, 240), 2400);
    expect(new Set(quadros).size).toBe(quadros.length);
    expect(quadros).toEqual([...quadros].sort((a, b) => a - b));
    expect(quadros.every((q) => q % 4 !== 0)).toBe(true);
    for (const mudanca of [300, 420]) {
      for (let q = mudanca - JANELA_REFINO_QUADROS; q <= mudanca + JANELA_REFINO_QUADROS; q++) {
        if (q % 4 !== 0) expect(quadros).toContain(q);
      }
    }
  });

  it('fica dentro do vídeo', () => {
    const cedo = (q: number) => (q >= 4 && q < 100 ? AR : CHAO);
    const quadros = janelasDeRefino(grossa(cedo, 200, 240), 200);
    expect(Math.min(...quadros)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...quadros)).toBeLessThan(200);
  });

  it('sem pés suficientes não pede refino', () => {
    expect(
      janelasDeRefino(
        grossa(() => null, 2400, 240),
        2400,
      ),
    ).toEqual([]);
  });

  it('ponta a ponta: as duas passadas dão o mesmo que todos os quadros', () => {
    const casos: [(q: number) => number, number, boolean][] = [
      [(q) => (q >= 1301 && q < 1543 ? AR : CHAO), 2400, false],
      [(q) => dropJump(q - 1003), 2400, true],
    ];
    for (const [yPe, total, dj] of casos) {
      const todos = sugerirQuadrosPelosPes(serie(total, yPe), dj);
      const primeira = grossa(yPe, total, 240);
      const refino = janelasDeRefino(primeira, total).map((quadro) => ({
        quadro,
        yPe: yPe(quadro),
        perna: 0.4,
      }));
      expect(primeira.length + refino.length).toBeLessThan(700);
      expect(sugerirQuadrosPelosPes([...primeira, ...refino], dj)).toEqual(todos);
      expect(todos.tipo).toBe('pronta');
    }
  });
});

describe('ajusteDaSugestao', () => {
  it('marcado menos sugerido', () => {
    expect(ajusteDaSugestao(299, 300)).toBe(1);
    expect(ajusteDaSugestao(300, 300)).toBe(0);
    expect(ajusteDaSugestao(302, 300)).toBe(-2);
  });
});

describe('textoDoAjuste', () => {
  it('conferido ou ajustado com sinal e plural', () => {
    expect(textoDoAjuste(300, 300)).toBe('conferido');
    expect(textoDoAjuste(299, 300)).toBe('ajustado +1 quadro');
    expect(textoDoAjuste(300, 297)).toBe('ajustado -3 quadros');
  });
});
