import type { AvaliacaoDoHistorico } from '@/types/assessment';
import type { PontoMelhoria } from '@/types/melhoria';
import {
  consolidarGrupos,
  criarPontoLivre,
  estadoDoGrupo,
  estadoDoLocal,
  explicacaoDaRazao,
  gruposAvaliados,
  linhasDaTabela,
  LOCAIS_MAPA,
  medidaDoLado,
  MOTIVO_AVALIADOR,
  motivosDoLocal,
  razaoDoLado,
  reconhecerGrupo,
  ROTULO_GRUPO,
  sugerirMelhorias,
  textoDoLado,
} from '@/utils/melhorias';

import { avaliacaoAgachamento, avaliacaoSalto, perna } from '../helpers/historicoDeTeste';

const DATA = '2026-11-22T10:00';

function cmjUni(valor: number | null, extra: Partial<AvaliacaoDoHistorico> = {}) {
  const a = avaliacaoSalto(
    'cmj_uni',
    DATA,
    { direita: perna(26), esquerda: perna(30) },
    {
      lsi: { valor, base: 'altura', modo: 'lesionada', pernaMaisFraca: null },
      pernaLesionada: 'direita',
    },
  );
  return { ...a, ...extra };
}

function djUni(valor: number, rsis: [number, number] = [1.1, 1.2]) {
  return avaliacaoSalto(
    'dj_uni',
    DATA,
    { direita: perna(17, rsis[0]), esquerda: perna(19, rsis[1]) },
    {
      lsi: { valor, base: 'rsi', modo: 'lesionada', pernaMaisFraca: null },
      pernaLesionada: 'esquerda',
    },
  );
}

function agach(perda: number | null, melhor = 0.9) {
  const a = avaliacaoAgachamento(DATA, melhor);
  return a.resumo.tipo === 'agach'
    ? { ...a, resumo: { ...a.resumo, perdaVelocidadePct: perda } }
    : a;
}

const sugerir = (a: AvaliacaoDoHistorico) => sugerirMelhorias(a.resumo, a.pernaLesionada);

describe('sugerirMelhorias', () => {
  it('CMJ unilateral, LSI 86,9%, direita lesionada: força e potência só na direita', () => {
    const [ponto, ...resto] = sugerir(cmjUni(86.9));
    expect(resto).toEqual([]);
    expect(ponto).toEqual({
      titulo: 'Força e potência da perna direita (lesionada)',
      grupos: [
        { grupo: 'quadriceps', lado: 'direita' },
        { grupo: 'gluteo_maximo', lado: 'direita' },
        { grupo: 'posteriores', lado: 'direita' },
      ],
      motivo: 'LSI 86,9% (bom a partir de 90%)',
      foco: 'Força e potência unilateral para levar o LSI de 86,9% a 90% ou mais.',
      origem: 'sugerido',
    });
  });

  it('LSI exatamente 90% não gera ponto; 89,9% gera; nulo não gera', () => {
    expect(sugerir(cmjUni(90))).toEqual([]);
    expect(sugerir(cmjUni(89.9))).toHaveLength(1);
    expect(sugerir(cmjUni(null))).toEqual([]);
  });

  it('modo "mais fraca" mira a perna mais fraca', () => {
    const a = cmjUni(80, { pernaLesionada: 'nenhuma' });
    const resumo = a.resumo.tipo === 'salto' ? a.resumo : null;
    const comFraca = {
      ...a,
      resumo: {
        ...resumo!,
        lsi: {
          valor: 80,
          base: 'altura' as const,
          modo: 'mais_fraca' as const,
          pernaMaisFraca: 'esquerda' as const,
        },
      },
    };
    const [ponto] = sugerir(comFraca);
    expect(ponto.titulo).toBe('Força e potência da perna esquerda (a mais fraca)');
    expect(ponto.grupos.every((g) => g.lado === 'esquerda')).toBe(true);
  });

  it('Drop Jump unilateral: LSI pelo RSI vira reatividade na perna alvo', () => {
    const [ponto] = sugerir(djUni(85));
    expect(ponto.titulo).toBe('Reatividade da perna esquerda (lesionada)');
    expect(ponto.grupos).toEqual([
      { grupo: 'triceps_sural', lado: 'esquerda' },
      { grupo: 'quadriceps', lado: 'esquerda' },
    ]);
    expect(ponto.motivo).toBe('LSI pelo RSI 85,0% (bom a partir de 90%)');
  });

  it('RSI abaixo de 1,0 e contato acima de 250 ms, na ordem LSI, RSI, contato', () => {
    const dj = avaliacaoSalto('dj', DATA, {
      unica: { ...perna(20, 0.74), tempoContatoMs: 280 },
    });
    expect(sugerir(dj).map((p) => [p.titulo, p.motivo])).toEqual([
      ['Reatividade', 'RSI 0,74 (referência 1,0)'],
      ['Tempo de chão longo', 'contato 280 ms (referência até 250 ms)'],
    ]);
    const noLimite = avaliacaoSalto('dj', DATA, {
      unica: { ...perna(20, 1.0), tempoContatoMs: 250 },
    });
    expect(sugerir(noLimite)).toEqual([]);
  });

  it('agachamento: perda acima de 20% e melhor velocidade abaixo de 0,5 m/s', () => {
    expect(sugerir(agach(20))).toEqual([]);
    expect(sugerir(agach(28.8)).map((p) => p.motivo)).toEqual([
      'perda de velocidade 28,8% (referência até 20%)',
    ]);
    expect(sugerir(agach(null, 0.45)).map((p) => p.motivo)).toEqual([
      'melhor velocidade 0,45 m/s (referência 0,5 m/s)',
    ]);
    expect(sugerir(agach(32.3))[0].grupos).toEqual([
      { grupo: 'quadriceps', lado: 'ambas' },
      { grupo: 'gluteo_maximo', lado: 'ambas' },
    ]);
  });

  it('nenhum texto cita exercício', () => {
    const textos = [cmjUni(70), djUni(70, [0.5, 0.6]), agach(45, 0.4)]
      .flatMap(sugerir)
      .flatMap((p) => [p.titulo, p.motivo, p.foco])
      .join(' ')
      .toLowerCase();
    for (const exercicio of [
      'agachamento búlgaro',
      'leg press',
      'stiff',
      'afundo',
      'saltos na caixa',
      'séries de',
    ]) {
      expect(textos).not.toContain(exercicio);
    }
  });

  it('responde em menos de 5 ms por avaliação', () => {
    const inicio = performance.now();
    for (let i = 0; i < 100; i += 1) sugerir(djUni(80, [0.7, 0.8]));
    expect((performance.now() - inicio) / 100).toBeLessThan(5);
  });
});

describe('mapa e grupos', () => {
  const ponto = (grupos: PontoMelhoria['grupos'], motivo = 'm'): PontoMelhoria => ({
    titulo: 't',
    grupos,
    motivo,
    foco: '',
    origem: 'sugerido',
  });

  it('ROTULO_GRUPO tem os cinco grupos', () => {
    expect(Object.keys(ROTULO_GRUPO)).toHaveLength(5);
    expect(ROTULO_GRUPO.triceps_sural).toBe('Tríceps sural (panturrilha)');
  });

  it('consolidarGrupos une lados sem repetir e "ambas" vira as duas pernas', () => {
    expect(
      consolidarGrupos([
        ponto([{ grupo: 'quadriceps', lado: 'direita' }]),
        ponto([
          { grupo: 'quadriceps', lado: 'ambas' },
          { grupo: 'triceps_sural', lado: 'esquerda' },
        ]),
      ]),
    ).toEqual({ quadriceps: ['direita', 'esquerda'], triceps_sural: ['esquerda'] });
  });

  it('grupos avaliados de cada protocolo', () => {
    expect(gruposAvaliados('cmj_bi')).toEqual(['quadriceps', 'gluteo_maximo', 'posteriores']);
    expect(gruposAvaliados('sj')).toEqual(gruposAvaliados('cmj_uni'));
    expect(gruposAvaliados('dj_uni')).toContain('triceps_sural');
    expect(gruposAvaliados('agach')).toEqual(['quadriceps', 'gluteo_maximo']);
  });

  it('estado: melhorar > ok > neutro, por grupo e por local', () => {
    const grupos = consolidarGrupos([ponto([{ grupo: 'quadriceps', lado: 'direita' }])]);
    const avaliados = gruposAvaliados('cmj_uni');
    expect(estadoDoGrupo(grupos, avaliados, 'quadriceps', 'direita')).toBe('melhorar');
    expect(estadoDoGrupo(grupos, avaliados, 'quadriceps', 'esquerda')).toBe('ok');
    expect(estadoDoGrupo(grupos, avaliados, 'triceps_sural', 'direita')).toBe('neutro');
    const [quadril, coxa, panturrilha] = LOCAIS_MAPA;
    expect(estadoDoLocal(grupos, avaliados, coxa, 'direita')).toBe('melhorar');
    expect(estadoDoLocal(grupos, avaliados, quadril, 'direita')).toBe('ok');
    expect(estadoDoLocal(grupos, avaliados, panturrilha, 'direita')).toBe('neutro');
  });

  it('textoDoLado', () => {
    expect(textoDoLado(['direita'])).toBe('perna direita');
    expect(textoDoLado(['direita', 'esquerda'])).toBe('ambas as pernas');
  });

  it('motivosDoLocal: sem repetir, e "citado pelo avaliador" no ponto livre', () => {
    const [, coxa] = LOCAIS_MAPA;
    const pontos = [
      ponto([{ grupo: 'quadriceps', lado: 'direita' }], 'LSI 80,0%'),
      ponto([{ grupo: 'posteriores', lado: 'direita' }], 'LSI 80,0%'),
      criarPontoLivre('Fortalecer quadríceps'),
    ];
    expect(motivosDoLocal(pontos, coxa, 'direita')).toEqual(['LSI 80,0%', MOTIVO_AVALIADOR]);
    expect(motivosDoLocal(pontos, coxa, 'esquerda')).toEqual([MOTIVO_AVALIADOR]);
  });
});

describe('tabela dos locais', () => {
  it('unilateral: uma linha por local e perna, sem locais neutros, motivo no "!"', () => {
    const a = cmjUni(86.9);
    const linhas = linhasDaTabela(sugerir(a), a);
    expect(linhas.map((l) => [l.local.id, l.lado, l.estado])).toEqual([
      ['quadril', 'direita', 'melhorar'],
      ['quadril', 'esquerda', 'ok'],
      ['coxa', 'direita', 'melhorar'],
      ['coxa', 'esquerda', 'ok'],
    ]);
    expect(linhas[0].motivos).toEqual(['LSI 86,9% (bom a partir de 90%)']);
    expect(linhas[1].motivos).toEqual([]);
    expect(linhas[0].grupos).toEqual(['gluteo_maximo']);
  });

  it('agachamento: uma linha "ambas" por local avaliado', () => {
    const a = agach(32.3);
    const linhas = linhasDaTabela(sugerir(a), a);
    expect(linhas.map((l) => [l.local.id, l.lado, l.estado])).toEqual([
      ['quadril', 'ambas', 'melhorar'],
      ['coxa', 'ambas', 'melhorar'],
    ]);
  });

  it('razão: LSI na perna alvo e 100 na outra; 100 − perda; RSI ÷ 1,0; null sem referência', () => {
    expect(razaoDoLado(cmjUni(86.9), 'direita')).toBe(86.9);
    expect(razaoDoLado(cmjUni(86.9), 'esquerda')).toBe(100);
    expect(razaoDoLado(cmjUni(null), 'direita')).toBeNull();
    expect(razaoDoLado(agach(32.3), 'direita')).toBeCloseTo(67.7, 10);
    expect(razaoDoLado(agach(null), 'direita')).toBeNull();
    expect(
      razaoDoLado(avaliacaoSalto('dj', DATA, { unica: perna(20, 0.74) }), 'direita'),
    ).toBeCloseTo(74, 10);
    expect(razaoDoLado(avaliacaoSalto('cmj_bi', DATA, { unica: perna(35) }), 'direita')).toBeNull();
  });

  it('medida da linha e explicação da razão', () => {
    expect(medidaDoLado(cmjUni(86.9), 'esquerda')).toBe('30,0 cm');
    expect(medidaDoLado(djUni(85), 'direita')).toBe('RSI 1,10');
    expect(medidaDoLado(agach(10, 0.848), 'direita')).toBe('0,85 m/s');
    expect(explicacaoDaRazao(cmjUni(86.9))).toBe(
      'Razão: LSI pela altura, perna direita ÷ outra perna (base 100%; bom a partir de 90%).',
    );
    expect(explicacaoDaRazao(agach(10))).toBe(
      'Razão: velocidade da última repetição ÷ a da melhor (bom a partir de 80%).',
    );
    expect(explicacaoDaRazao(avaliacaoSalto('dj', DATA, { unica: perna(20, 0.74) }))).toBe(
      'Razão: RSI ÷ referência 1,0 (bom a partir de 100%).',
    );
    expect(explicacaoDaRazao(avaliacaoSalto('cmj_bi', DATA, { unica: perna(35) }))).toBe(
      'Razão: este protocolo não tem referência para comparar.',
    );
  });
});

describe('ponto livre', () => {
  it.each([
    ['glúteo médio', 'gluteo_medio'],
    ['GLUTEO MEDIO', 'gluteo_medio'],
    ['Fortalecer quadríceps', 'quadriceps'],
    ['Mobilidade de tornozelo', null],
  ])('reconhece "%s" como %p', (texto, grupo) => {
    expect(reconhecerGrupo(texto)).toBe(grupo);
  });

  it('criarPontoLivre: grupo reconhecido nas duas pernas, origem avaliador; vazio recusado', () => {
    expect(criarPontoLivre('  Glúteo médio  ')).toEqual({
      titulo: 'Glúteo médio',
      grupos: [{ grupo: 'gluteo_medio', lado: 'ambas' }],
      motivo: MOTIVO_AVALIADOR,
      foco: '',
      origem: 'avaliador',
    });
    expect(criarPontoLivre('Mobilidade de tornozelo').grupos).toEqual([]);
    expect(() => criarPontoLivre('   ')).toThrow();
  });
});
