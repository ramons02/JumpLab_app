import { render, screen } from '@testing-library/react-native';

import { GraficoEvolucao, MENSAGEM_INSUFICIENTE } from '@/components/GraficoEvolucao';
import cores from '@/theme/cores';
import type { GraficoEvolucao as Grafico } from '@/utils/evolucao';

import { graficosDesenhados, limparGraficos } from '../helpers/mockGiftedCharts';

interface PropsLinha {
  dataSet: {
    color: string;
    data: {
      value?: number;
      label?: string;
      hideDataPoint: boolean;
      customDataPoint?: unknown;
      labelTextStyle: { color: string };
    }[];
  }[];
  showReferenceLine1: boolean;
  referenceLine1Position?: number;
  yAxisOffset: number;
  interpolateMissingValues: boolean;
  showDataPointsForMissingValues: boolean;
}

const ultimoDesenho = () =>
  graficosDesenhados[graficosDesenhados.length - 1] as unknown as PropsLinha;

function grafico(extra: Partial<Grafico> = {}): Grafico {
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
        pontos: [{ valor: 20, baixaPrecisao: false }, null, { valor: 24, baixaPrecisao: false }],
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

describe('GraficoEvolucao', () => {
  beforeEach(limparGraficos);

  it('sem linha com 2 pontos mostra a mensagem de insuficiência e não desenha', async () => {
    await render(
      <GraficoEvolucao
        grafico={grafico({
          eixo: ['2026-11-01'],
          linhas: [
            { nome: 'CMJ Bilateral', cor: 'unica', pontos: [{ valor: 30, baixaPrecisao: false }] },
          ],
        })}
      />,
    );
    expect(screen.getByText(MENSAGEM_INSUFICIENTE)).toBeOnTheScreen();
    expect(screen.queryByTestId('grafico-linhas')).toBeNull();
  });

  it('uma entrada de dataSet por linha, com a cor do token e os nulos sem ponto', async () => {
    await render(<GraficoEvolucao grafico={grafico()} />);
    const props = ultimoDesenho();

    expect(props.dataSet.map((d) => d.color)).toEqual([
      cores.grafico.direita,
      cores.grafico.esquerda,
    ]);
    expect(props.dataSet[0].data.map((p) => p.value)).toEqual([20, undefined, 24]);
    expect(props.dataSet[0].data.map((p) => p.hideDataPoint)).toEqual([false, true, false]);
    expect(props.interpolateMissingValues).toBe(true);
    expect(props.showDataPointsForMissingValues).toBe(false);
    expect(props.showReferenceLine1).toBe(false);
  });

  it('rótulos do eixo em dd/mm com a cor do eixo', async () => {
    await render(<GraficoEvolucao grafico={grafico()} />);
    const pontos = ultimoDesenho().dataSet[0].data;
    expect(pontos.map((p) => p.label)).toEqual(['01/11', '08/11', '15/11']);
    expect(pontos[0].labelTextStyle.color).toBe(cores.grafico.eixo);
  });

  it('ponto de baixa precisão vazado e item na legenda só quando houver', async () => {
    await render(<GraficoEvolucao grafico={grafico()} />);
    expect(screen.queryByText('○ baixa precisão')).toBeNull();

    const comBaixa = grafico();
    comBaixa.linhas[0].pontos[0] = { valor: 20, baixaPrecisao: true };
    await render(<GraficoEvolucao grafico={comBaixa} />);
    expect(ultimoDesenho().dataSet[0].data[0].customDataPoint).toEqual(expect.any(Function));
    expect(ultimoDesenho().dataSet[0].data[2].customDataPoint).toBeUndefined();
    expect(screen.getByText('○ baixa precisão')).toBeOnTheScreen();
  });

  it('LSI com a referência de 90% e a unidade na legenda', async () => {
    await render(
      <GraficoEvolucao
        grafico={grafico({
          titulo: 'Simetria (LSI)',
          unidade: '%',
          referencia: 90,
          linhas: [
            {
              nome: 'LSI por altura (CMJ)',
              cor: 'lsiAltura',
              pontos: [
                { valor: 80, baixaPrecisao: false },
                { valor: 86, baixaPrecisao: false },
                null,
              ],
            },
          ],
        })}
      />,
    );
    expect(ultimoDesenho().showReferenceLine1).toBe(true);
    expect(ultimoDesenho().referenceLine1Position).toBe(90);
    expect(screen.getByText('LSI por altura (CMJ)')).toBeOnTheScreen();
    expect(screen.getByText('%')).toBeOnTheScreen();
  });
});
