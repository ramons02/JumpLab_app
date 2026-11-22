import {
  medidaPrincipal,
  rsiDaAvaliacao,
  ultimoLsi,
  ultimoRsi,
  ultimoSalto,
} from '@/utils/resumoPerfil';

import { avaliacaoAgachamento, avaliacaoSalto, lsi, perna } from '../helpers/historicoDeTeste';

describe('cards do perfil', () => {
  it('lista vazia dá null em todos', () => {
    expect(ultimoLsi([])).toBeNull();
    expect(ultimoRsi([])).toBeNull();
    expect(ultimoSalto([])).toBeNull();
  });

  it('só bilaterais dá último LSI nulo', () => {
    expect(
      ultimoLsi([avaliacaoSalto('cmj_bi', '2026-11-10T09:00', { unica: perna(35.4) })]),
    ).toBeNull();
  });

  it('CA02: Drop Jump unilateral 92% mais recente vence o CMJ unilateral 85%, base RSI e verde', () => {
    const lista = [
      avaliacaoSalto(
        'dj_uni',
        '2026-11-14T09:00',
        { direita: perna(17, 1.0), esquerda: perna(19, 1.1) },
        {
          lsi: lsi(92, 'rsi'),
        },
      ),
      avaliacaoSalto(
        'cmj_uni',
        '2026-11-07T09:00',
        { direita: perna(26), esquerda: perna(30) },
        {
          lsi: lsi(85),
        },
      ),
    ];
    expect(ultimoLsi(lista)).toEqual({
      valor: 92,
      base: 'rsi',
      cor: 'verde',
      dataHora: '2026-11-14T09:00',
    });
  });

  it.each([
    [90, 'verde'],
    [89.9, 'amarelo'],
    [79.9, 'vermelho'],
  ] as const)('LSI %p dá %p', (valor, cor) => {
    const lista = [avaliacaoSalto('cmj_uni', '2026-11-07T09:00', {}, { lsi: lsi(valor) })];
    expect(ultimoLsi(lista)?.cor).toBe(cor);
  });

  it('LSI com valor nulo dá card com valor e cor nulos', () => {
    const lista = [avaliacaoSalto('cmj_uni', '2026-11-07T09:00', {}, { lsi: lsi(null) })];
    expect(ultimoLsi(lista)).toMatchObject({ valor: null, cor: null });
  });

  it('RSI: dj usa a perna única; dj_uni usa a lesionada gravada; com nenhuma, a direita', () => {
    const dj = avaliacaoSalto('dj', '2026-11-01T07:00', { unica: perna(25, 1.234) });
    const djUni = avaliacaoSalto(
      'dj_uni',
      '2026-11-02T07:00',
      { direita: perna(17, 0.9), esquerda: perna(19, 1.1) },
      { pernaLesionada: 'esquerda' },
    );
    const djUniSem = avaliacaoSalto(
      'dj_uni',
      '2026-11-03T07:00',
      { direita: perna(17, 0.9), esquerda: perna(19, 1.1) },
      { pernaLesionada: 'nenhuma' },
    );
    expect(rsiDaAvaliacao(dj)).toBe(1.234);
    expect(rsiDaAvaliacao(djUni)).toBe(1.1);
    expect(rsiDaAvaliacao(djUniSem)).toBe(0.9);
    expect(
      rsiDaAvaliacao(avaliacaoSalto('cmj_bi', '2026-11-03T07:00', { unica: perna(30) })),
    ).toBeNull();
    expect(ultimoRsi([djUniSem, dj])).toEqual({
      valor: 0.9,
      protocolo: 'dj_uni',
      dataHora: '2026-11-03T07:00',
    });
  });

  it('último salto pula o agachamento mais recente, com a mesma regra de perna', () => {
    const lista = [
      avaliacaoAgachamento('2026-11-20T07:00', 0.85),
      avaliacaoSalto(
        'cmj_uni',
        '2026-11-10T07:00',
        { direita: perna(26), esquerda: perna(30) },
        {
          pernaLesionada: 'esquerda',
        },
      ),
    ];
    expect(ultimoSalto(lista)).toBe(30);
    expect(ultimoSalto([avaliacaoAgachamento('2026-11-20T07:00', 0.85)])).toBeNull();
  });
});

describe('medidaPrincipal', () => {
  it('cmj_uni: LSI com 1 casa e cor', () => {
    const a = avaliacaoSalto('cmj_uni', '2026-11-07T09:00', {}, { lsi: lsi(85) });
    expect(medidaPrincipal(a)).toEqual({ texto: 'LSI 85,0%', cor: 'amarelo' });
  });

  it('cmj_uni com LSI nulo: "LSI não calculado" sem cor', () => {
    const a = avaliacaoSalto('cmj_uni', '2026-11-07T09:00', {}, { lsi: lsi(null) });
    expect(medidaPrincipal(a)).toEqual({ texto: 'LSI não calculado', cor: null });
  });

  it('dj: RSI com 2 casas sem cor', () => {
    const a = avaliacaoSalto('dj', '2026-11-07T09:00', { unica: perna(25, 1.234) });
    expect(medidaPrincipal(a)).toEqual({ texto: 'RSI 1,23', cor: null });
  });

  it.each(['cmj_bi', 'sj'] as const)('%s: altura com 1 casa', (protocolo) => {
    const a = avaliacaoSalto(protocolo, '2026-11-07T09:00', { unica: perna(35.4) });
    expect(medidaPrincipal(a)).toEqual({ texto: '35,4 cm', cor: null });
  });

  it('agach: melhor velocidade com 2 casas sem cor', () => {
    expect(medidaPrincipal(avaliacaoAgachamento('2026-11-07T09:00', 0.848))).toEqual({
      texto: '0,85 m/s',
      cor: null,
    });
  });

  it('com 100 avaliações, os cards e as medidas respondem em menos de 100 ms', () => {
    const lista = Array.from({ length: 100 }, (_, i) =>
      i % 2
        ? avaliacaoSalto(
            'cmj_uni',
            `2026-10-${String((i % 28) + 1).padStart(2, '0')}T09:00`,
            {
              direita: perna(26),
              esquerda: perna(30),
            },
            { lsi: lsi(86) },
          )
        : avaliacaoSalto('dj', '2026-10-01T09:00', { unica: perna(25, 1.2) }),
    );
    const inicio = performance.now();
    ultimoLsi(lista);
    ultimoRsi(lista);
    ultimoSalto(lista);
    lista.forEach(medidaPrincipal);
    expect(performance.now() - inicio).toBeLessThan(100);
  });
});
