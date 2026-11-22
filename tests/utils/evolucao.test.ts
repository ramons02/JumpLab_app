import {
  montarGraficoLsi,
  montarGraficoProtocolo,
  protocolosAvaliados,
  temPontosSuficientes,
} from '@/utils/evolucao';

import { agachamento, lsi, pernaResumo, salto } from '../helpers/historicoDeTeste';

const valores = (pontos: ({ valor: number } | null)[]) => pontos.map((p) => p?.valor ?? null);

describe('protocolosAvaliados', () => {
  it('na ordem fixa, com o agachamento por último', () => {
    const historico = [
      agachamento('2026-11-01T10:00', 1),
      salto('dj', '2026-11-02T10:00', { unica: pernaResumo(30, { rsi: 1.5 }) }),
      salto('cmj_bi', '2026-11-03T10:00', { unica: pernaResumo(30) }),
    ];
    expect(protocolosAvaliados(historico)).toEqual(['cmj_bi', 'dj', 'agach']);
  });
});

describe('montarGraficoProtocolo', () => {
  it('só o protocolo pedido, em ordem de data, com a altura em cm', () => {
    const historico = [
      salto('cmj_bi', '2026-11-20T10:00', { unica: pernaResumo(32) }),
      salto('sj', '2026-11-10T10:00', { unica: pernaResumo(25) }),
      salto('cmj_bi', '2026-11-05T10:00', { unica: pernaResumo(30) }),
    ];
    const grafico = montarGraficoProtocolo('cmj_bi', historico, 'direita');

    expect(grafico).toMatchObject({
      titulo: 'CMJ Bilateral',
      medida: 'Altura do salto',
      unidade: 'cm',
      casas: 1,
    });
    expect(grafico.eixo).toEqual(['2026-11-05', '2026-11-20']);
    expect(grafico.linhas).toHaveLength(1);
    expect(grafico.linhas[0].nome).toBe('CMJ Bilateral');
    expect(valores(grafico.linhas[0].pontos)).toEqual([30, 32]);
    expect(grafico.referencia).toBeNull();
  });

  it('Squat Jump também usa a altura', () => {
    const grafico = montarGraficoProtocolo(
      'sj',
      [salto('sj', '2026-11-10T10:00', { unica: pernaResumo(25) })],
      'nenhuma',
    );
    expect(grafico.unidade).toBe('cm');
  });

  it('Drop Jump usa o RSI com 2 casas', () => {
    const grafico = montarGraficoProtocolo(
      'dj',
      [salto('dj', '2026-11-10T10:00', { unica: pernaResumo(30, { rsi: 1.42 }) })],
      'nenhuma',
    );
    expect(grafico).toMatchObject({ medida: 'RSI', unidade: 'RSI', casas: 2 });
    expect(valores(grafico.linhas[0].pontos)).toEqual([1.42]);
  });

  it('unilateral: duas linhas com a perna lesionada indicada e baixa precisão por perna', () => {
    const historico = [
      salto('cmj_uni', '2026-11-05T10:00', {
        direita: pernaResumo(20, { baixaPrecisao: true }),
        esquerda: pernaResumo(25),
      }),
      salto('cmj_uni', '2026-11-12T10:00', { direita: pernaResumo(22), esquerda: pernaResumo(26) }),
    ];
    const grafico = montarGraficoProtocolo('cmj_uni', historico, 'direita');

    expect(grafico.linhas.map((l) => [l.nome, l.cor])).toEqual([
      ['Direita (lesionada)', 'direita'],
      ['Esquerda', 'esquerda'],
    ]);
    expect(grafico.linhas[0].pontos[0]).toEqual({ valor: 20, baixaPrecisao: true });
    expect(grafico.linhas[1].pontos[0]).toEqual({ valor: 25, baixaPrecisao: false });
  });

  it('Drop Jump unilateral usa o RSI por perna', () => {
    const grafico = montarGraficoProtocolo(
      'dj_uni',
      [
        salto('dj_uni', '2026-11-05T10:00', {
          direita: pernaResumo(20, { rsi: 1.1 }),
          esquerda: pernaResumo(22, { rsi: 1.3 }),
        }),
      ],
      'direita',
    );
    expect(grafico.unidade).toBe('RSI');
    expect(grafico.linhas.map((l) => valores(l.pontos))).toEqual([[1.1], [1.3]]);
  });

  it('paciente sem lesão: pernas sem "(lesionada)"', () => {
    const grafico = montarGraficoProtocolo(
      'cmj_uni',
      [
        salto('cmj_uni', '2026-11-05T10:00', {
          direita: pernaResumo(20),
          esquerda: pernaResumo(25),
        }),
      ],
      'nenhuma',
    );
    expect(grafico.linhas.map((l) => l.nome)).toEqual(['Direita', 'Esquerda']);
  });

  it('bilateral: baixa precisão vem da avaliação', () => {
    const grafico = montarGraficoProtocolo(
      'cmj_bi',
      [salto('cmj_bi', '2026-11-05T10:00', { unica: pernaResumo(30) }, { baixaPrecisao: true })],
      'nenhuma',
    );
    expect(grafico.linhas[0].pontos[0]).toEqual({ valor: 30, baixaPrecisao: true });
  });

  it('duas avaliações no mesmo dia viram dois pontos', () => {
    const historico = [
      salto('cmj_bi', '2026-11-05T09:00', { unica: pernaResumo(30) }),
      salto('cmj_bi', '2026-11-05T17:00', { unica: pernaResumo(31) }),
    ];
    const grafico = montarGraficoProtocolo('cmj_bi', historico, 'nenhuma');
    expect(grafico.eixo).toEqual(['2026-11-05', '2026-11-05']);
    expect(temPontosSuficientes(grafico)).toBe(true);
  });

  it('agachamento: melhor velocidade em m/s, sem baixa precisão', () => {
    const grafico = montarGraficoProtocolo(
      'agach',
      [agachamento('2026-11-05T10:00', 0.94), agachamento('2026-11-12T10:00', 0.98)],
      'nenhuma',
    );
    expect(grafico).toMatchObject({
      titulo: 'Agachamento com barra',
      medida: 'Melhor velocidade',
      unidade: 'm/s',
      casas: 2,
    });
    expect(grafico.linhas[0].pontos).toEqual([
      { valor: 0.94, baixaPrecisao: false },
      { valor: 0.98, baixaPrecisao: false },
    ]);
  });

  it('uma única avaliação não tem pontos suficientes (CA02)', () => {
    const grafico = montarGraficoProtocolo(
      'cmj_bi',
      [salto('cmj_bi', '2026-11-05T10:00', { unica: pernaResumo(30) })],
      'nenhuma',
    );
    expect(temPontosSuficientes(grafico)).toBe(false);
  });
});

describe('montarGraficoLsi', () => {
  const cmj = (data: string, valor: number | null) =>
    salto(
      'cmj_uni',
      data,
      { direita: pernaResumo(20), esquerda: pernaResumo(25) },
      { lsi: lsi(valor, 'altura') },
    );
  const dj = (data: string, valor: number) =>
    salto(
      'dj_uni',
      data,
      { direita: pernaResumo(20, { rsi: 1 }), esquerda: pernaResumo(22, { rsi: 1.2 }) },
      { lsi: lsi(valor, 'rsi') },
    );

  it('CMJ e Drop Jump unilaterais em duas linhas no mesmo eixo, com referência 90 (CA01)', () => {
    const historico = [
      cmj('2026-11-01T10:00', 80),
      dj('2026-11-02T10:00', 82),
      cmj('2026-11-08T10:00', 85),
      salto('cmj_bi', '2026-11-09T10:00', { unica: pernaResumo(30) }),
      dj('2026-11-10T10:00', 88),
      cmj('2026-11-15T10:00', 91),
    ];
    const grafico = montarGraficoLsi(historico);

    expect(grafico).toMatchObject({
      titulo: 'Simetria (LSI)',
      medida: 'LSI',
      unidade: '%',
      casas: 1,
      referencia: 90,
    });
    expect(grafico?.eixo).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-08',
      '2026-11-10',
      '2026-11-15',
    ]);
    expect(grafico?.linhas.map((l) => [l.nome, l.cor, valores(l.pontos)])).toEqual([
      ['LSI por altura (CMJ)', 'lsiAltura', [80, null, 85, null, 91]],
      ['LSI por RSI (Drop Jump)', 'lsiRsi', [null, 82, null, 88, null]],
    ]);
  });

  it('só bilaterais devolve null', () => {
    expect(
      montarGraficoLsi([salto('cmj_bi', '2026-11-01T10:00', { unica: pernaResumo(30) })]),
    ).toBeNull();
  });

  it('LSI nulo não gera ponto, e linha sem ponto sai do gráfico', () => {
    const grafico = montarGraficoLsi([cmj('2026-11-01T10:00', null), cmj('2026-11-08T10:00', 85)]);
    expect(grafico?.linhas).toHaveLength(1);
    expect(valores(grafico?.linhas[0].pontos ?? [])).toEqual([null, 85]);
  });

  it('um único unilateral não tem pontos suficientes', () => {
    const grafico = montarGraficoLsi([cmj('2026-11-01T10:00', 85)]);
    expect(grafico && temPontosSuficientes(grafico)).toBe(false);
  });
});
