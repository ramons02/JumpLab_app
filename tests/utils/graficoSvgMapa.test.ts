import cores from '@/theme/cores';
import type { AvaliacaoDoHistorico } from '@/types/assessment';
import { montarHtmlTabelaLocais, montarSvgMapaMuscular } from '@/utils/graficoSvg';
import { consolidarGrupos, criarPontoLivre, sugerirMelhorias } from '@/utils/melhorias';

import { avaliacaoSalto, perna } from '../helpers/historicoDeTeste';

const CMJ_UNI: AvaliacaoDoHistorico = avaliacaoSalto(
  'cmj_uni',
  '2026-11-22T10:00',
  { direita: perna(26), esquerda: perna(30) },
  {
    lsi: { valor: 86.9, base: 'altura', modo: 'lesionada', pernaMaisFraca: null },
    pernaLesionada: 'direita',
  },
);
const PONTOS = sugerirMelhorias(CMJ_UNI.resumo, CMJ_UNI.pernaLesionada);
const COR = cores.papel.mapa;

function estado(svg: string, grupo: string, lado: string) {
  return new RegExp(`data-grupo="${grupo}" data-lado="${lado}" data-estado="(\\w+)"`).exec(
    svg,
  )?.[1];
}

describe('montarSvgMapaMuscular', () => {
  it('vermelho no grupo e lado a melhorar, verde nos avaliados, cinza nos não avaliados', () => {
    const svg = montarSvgMapaMuscular(consolidarGrupos(PONTOS), 'cmj_uni');
    expect(estado(svg, 'quadriceps', 'direita')).toBe('melhorar');
    expect(estado(svg, 'quadriceps', 'esquerda')).toBe('ok');
    expect(estado(svg, 'triceps_sural', 'direita')).toBe('neutro');
    expect(svg).toContain(COR.melhorar.fundo);
    expect(svg).toContain(COR.ok.fundo);
    expect(svg).toContain(COR.neutro.fundo);
  });

  it('marcadores numerados só nos locais não neutros, e a legenda', () => {
    const svg = montarSvgMapaMuscular(consolidarGrupos(PONTOS), 'cmj_uni');
    for (const n of [1, 2, 3, 4]) expect(svg).toContain(`data-local="${n}"`);
    expect(svg).not.toContain('data-local="5"');
    expect(svg).toContain('melhorar');
    expect(svg).toContain('não avaliado');
  });
});

describe('montarHtmlTabelaLocais', () => {
  it('mesmas linhas da tela, razão, motivo abaixo do "!" e a frase da razão', () => {
    const html = montarHtmlTabelaLocais(PONTOS, CMJ_UNI);
    expect(html).toContain('Coxa direita');
    expect(html).toContain('Coxa esquerda');
    expect(html).not.toContain('Panturrilha');
    expect(html).toContain('86,9%');
    expect(html).toContain('100,0%');
    expect(html).toContain('LSI 86,9% (bom a partir de 90%)');
    expect(html).toContain('Razão: LSI pela altura, perna direita ÷ outra perna');
  });

  it('escapa o texto do avaliador', () => {
    const livre = { ...criarPontoLivre('Glúteo médio'), motivo: '<b>x</b>' };
    const html = montarHtmlTabelaLocais([livre], CMJ_UNI);
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
