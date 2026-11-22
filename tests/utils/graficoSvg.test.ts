import cores from '@/theme/cores';
import type { GraficoEvolucao } from '@/utils/evolucao';
import { montarSvgGrafico } from '@/utils/graficoSvg';

function grafico(extra: Partial<GraficoEvolucao> = {}): GraficoEvolucao {
  return {
    titulo: 'CMJ Unilateral',
    medida: 'Altura do salto',
    unidade: 'cm',
    casas: 1,
    referencia: null,
    eixo: ['2026-11-01', '2026-11-08', '2026-11-15'],
    linhas: [
      {
        nome: 'Direita (lesionada)',
        cor: 'direita',
        pontos: [{ valor: 20, baixaPrecisao: false }, null, { valor: 24, baixaPrecisao: true }],
      },
      {
        nome: 'Esquerda',
        cor: 'esquerda',
        pontos: [{ valor: 25, baixaPrecisao: false }, { valor: 26, baixaPrecisao: false }, null],
      },
    ],
    ...extra,
  };
}

const contar = (svg: string, trecho: RegExp) => (svg.match(trecho) ?? []).length;

describe('montarSvgGrafico', () => {
  it('sem pontos suficientes devolve texto vazio, sem aviso de insuficiência', () => {
    const umPonto = grafico({
      eixo: ['2026-11-01'],
      linhas: [
        { nome: 'CMJ Bilateral', cor: 'unica', pontos: [{ valor: 30, baixaPrecisao: false }] },
      ],
    });
    expect(montarSvgGrafico(umPonto)).toBe('');
  });

  it('uma polyline por linha, pulando os nulos, e um círculo por ponto', () => {
    const svg = montarSvgGrafico(grafico());
    expect(contar(svg, /<polyline/g)).toBe(2);
    expect(contar(svg, /<circle/g)).toBe(4);
    expect(svg).toContain(`stroke="${cores.grafico.direita}"`);
    expect(svg).toContain(`stroke="${cores.grafico.esquerda}"`);
  });

  it('ponto de baixa precisão é vazado (miolo branco) e entra na legenda', () => {
    const svg = montarSvgGrafico(grafico());
    expect(svg).toContain(`fill="${cores.papel.fundo}" stroke="${cores.grafico.direita}"`);
    expect(svg).toContain('baixa precisão');
  });

  it('rótulos do eixo em dd/mm', () => {
    const svg = montarSvgGrafico(grafico());
    expect(svg).toContain('>01/11<');
    expect(svg).toContain('>15/11<');
  });

  it('LSI com a linha de referência tracejada', () => {
    const lsi = grafico({
      titulo: 'Simetria (LSI)',
      unidade: '%',
      referencia: 90,
      linhas: [
        {
          nome: 'LSI por altura (CMJ)',
          cor: 'lsiAltura',
          pontos: [{ valor: 80, baixaPrecisao: false }, { valor: 86, baixaPrecisao: false }, null],
        },
      ],
    });
    const svg = montarSvgGrafico(lsi);
    expect(svg).toMatch(/<line[^>]*stroke="#16a34a"[^>]*stroke-dasharray/);
    expect(svg).toContain('90%');
  });

  it('nomes da legenda escapados', () => {
    const svg = montarSvgGrafico(
      grafico({
        linhas: [
          {
            nome: 'Perna <A> & B',
            cor: 'unica',
            pontos: [{ valor: 1, baixaPrecisao: false }, { valor: 2, baixaPrecisao: false }, null],
          },
        ],
      }),
    );
    expect(svg).toContain('Perna &lt;A&gt; &amp; B');
    expect(svg).not.toContain('<A>');
  });

  it('sem azul', () => {
    expect(montarSvgGrafico(grafico()).toLowerCase()).not.toContain('#2563eb');
  });
});
