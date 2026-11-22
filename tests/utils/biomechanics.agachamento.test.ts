import type { SquatSeries } from '@/types/squat';
import { corPerda, DIAMETRO_DISCO_CM, medirAgachamento, pixelsPorCm } from '@/utils/biomechanics';

import { CALIBRACAO_CA01, repeticao, SERIE_CA01, SERIE_CA02 } from '../helpers/serieDeTeste';

describe('pixelsPorCm', () => {
  it('topo 100 e base 158,5 dão 1,3 px/cm (disco de 45 cm)', () => {
    expect(DIAMETRO_DISCO_CM).toBe(45);
    expect(pixelsPorCm(CALIBRACAO_CA01)).toBeCloseTo(1.3, 10);
    expect(pixelsPorCm({ topoY: 158.5, baseY: 100 })).toBeCloseTo(1.3, 10);
  });

  it('topo igual à base ou valores não finitos lançam erro', () => {
    expect(() => pixelsPorCm({ topoY: 100, baseY: 100 })).toThrow('mesmo ponto');
    expect(() => pixelsPorCm({ topoY: Number.NaN, baseY: 100 })).toThrow();
    expect(() => pixelsPorCm({ topoY: 0, baseY: Number.POSITIVE_INFINITY })).toThrow();
  });
});

describe('medirAgachamento', () => {
  it('CA01: amplitude 58,4615 cm, subida 0,6167 s, velocidade 0,9480 m/s e potência 558,0 W', () => {
    const r = medirAgachamento(SERIE_CA01, 60);
    const [rep] = r.repeticoes;
    expect(rep.numero).toBe(1);
    expect(rep.amplitudeCm).toBeCloseTo(58.4615, 4);
    expect(rep.subidaS).toBeCloseTo(0.6167, 4);
    expect(rep.descidaS).toBeCloseTo(0.9, 10);
    expect(rep.velocidadeMs).toBeCloseTo(0.948, 4);
    expect(rep.potenciaW).toBeCloseTo(558.0, 1);
    expect(r).toMatchObject({ cargaKg: 60, fps: 60, perdaVelocidadePct: null });
    expect(r.melhorVelocidadeMs).toBe(rep.velocidadeMs);
    expect(r.melhorPotenciaW).toBe(rep.potenciaW);
  });

  it('CA02: melhor 1,00 m/s e perda de 20,0%', () => {
    const r = medirAgachamento(SERIE_CA02, 60);
    expect(r.repeticoes.map((x) => x.velocidadeMs)).toEqual([
      expect.closeTo(0.9, 10),
      expect.closeTo(1.0, 10),
      expect.closeTo(0.8, 10),
    ]);
    expect(r.melhorVelocidadeMs).toBeCloseTo(1.0, 10);
    expect(r.perdaVelocidadePct).toBeCloseTo(20.0, 10);
    expect(r.repeticoes.map((x) => x.numero)).toEqual([1, 2, 3]);
  });

  it('velocidades iguais dão perda 0', () => {
    const serie: SquatSeries = {
      ...SERIE_CA01,
      repeticoes: [
        repeticao([0, 224], [50, 300], [80, 224]),
        repeticao([100, 224], [150, 300], [180, 224]),
      ],
    };
    expect(medirAgachamento(serie, 60).perdaVelocidadePct).toBe(0);
  });

  it('ignora repetições incompletas e numera só as completas', () => {
    const serie: SquatSeries = {
      ...SERIE_CA02,
      repeticoes: [
        SERIE_CA02.repeticoes[0],
        { inicio: { quadro: 100, y: 200 }, fundo: null, fim: null },
        SERIE_CA02.repeticoes[1],
      ],
    };
    const r = medirAgachamento(serie, 60);
    expect(r.repeticoes).toHaveLength(2);
    expect(r.repeticoes.map((x) => x.numero)).toEqual([1, 2]);
  });

  it.each([0, -60, Number.NaN])('FPS %p lança erro', (fps) => {
    expect(() => medirAgachamento({ ...SERIE_CA01, fps }, 60)).toThrow(RangeError);
  });

  it('calibração com topo igual à base lança erro', () => {
    expect(() =>
      medirAgachamento({ ...SERIE_CA01, calibracao: { topoY: 100, baseY: 100 } }, 60),
    ).toThrow('mesmo ponto');
  });

  it.each([0, -10, Number.NaN])('carga %p lança erro', (carga) => {
    expect(() => medirAgachamento(SERIE_CA01, carga)).toThrow('carga');
  });

  it('nenhuma repetição completa lança erro', () => {
    const serie = { ...SERIE_CA01, repeticoes: [{ inicio: null, fundo: null, fim: null }] };
    expect(() => medirAgachamento(serie, 60)).toThrow('repetição completa');
  });

  it('repetição completa com o fim no mesmo quadro do fundo lança erro', () => {
    const serie = { ...SERIE_CA01, repeticoes: [repeticao([46, 224], [100, 300], [100, 224])] };
    expect(() => medirAgachamento(serie, 60)).toThrow('ordem');
  });

  it('20 repetições respondem em menos de 50 ms', () => {
    const serie: SquatSeries = {
      ...SERIE_CA01,
      repeticoes: Array.from({ length: 20 }, (_, i) =>
        repeticao([i * 200, 224], [i * 200 + 50, 300], [i * 200 + 80, 224]),
      ),
    };
    const inicio = performance.now();
    medirAgachamento(serie, 60);
    expect(performance.now() - inicio).toBeLessThan(50);
  });
});

describe('corPerda', () => {
  it.each([
    [null, 'neutro'],
    [0, 'verde'],
    [20, 'verde'],
    [20.01, 'amarelo'],
    [40, 'amarelo'],
    [40.01, 'vermelho'],
    [100, 'vermelho'],
  ] as const)('%p dá %p', (perda, cor) => {
    expect(corPerda(perda)).toBe(cor);
  });
});
