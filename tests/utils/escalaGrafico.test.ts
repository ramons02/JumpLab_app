import { escalaDoGrafico, rotuloDoEixo } from '@/utils/escalaGrafico';
import type { GraficoEvolucao } from '@/utils/evolucao';

function grafico(valores: number[], referencia: number | null = null): GraficoEvolucao {
  return {
    titulo: 'x',
    medida: 'x',
    unidade: 'cm',
    casas: 1,
    referencia,
    eixo: valores.map(() => '2026-11-01'),
    linhas: [
      {
        nome: 'x',
        cor: 'unica',
        pontos: valores.map((valor) => ({ valor, baixaPrecisao: false })),
      },
    ],
  };
}

describe('escalaDoGrafico', () => {
  it('o eixo começa perto do menor valor e cobre o maior', () => {
    const { deslocamento, maximo } = escalaDoGrafico(grafico([30, 32]));
    expect(deslocamento).toBeGreaterThan(0);
    expect(deslocamento).toBeLessThanOrEqual(30);
    expect(deslocamento + maximo).toBeGreaterThanOrEqual(32);
  });

  it('no LSI a referência de 90 fica dentro do eixo', () => {
    const { deslocamento, maximo } = escalaDoGrafico(grafico([70, 75], 90));
    expect(deslocamento).toBeLessThanOrEqual(70);
    expect(deslocamento + maximo).toBeGreaterThanOrEqual(90);
  });

  it('valores pequenos (RSI, m/s) não deixam o eixo negativo', () => {
    expect(escalaDoGrafico(grafico([0.9, 1.2])).deslocamento).toBe(0);
  });
});

it('rotuloDoEixo vira dd/mm', () => {
  expect(rotuloDoEixo('2026-11-05')).toBe('05/11');
});
