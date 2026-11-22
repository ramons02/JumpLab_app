import { Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import cores from '@/theme/cores';
import { escalaDoGrafico, rotuloDoEixo, SECOES_EIXO_Y } from '@/utils/escalaGrafico';
import { temPontosSuficientes, type GraficoEvolucao as Grafico } from '@/utils/evolucao';

export const MENSAGEM_INSUFICIENTE = 'Avaliações insuficientes para o gráfico.';
const ALTURA_GRAFICO = 160;
const ESPACO_ENTRE_PONTOS = 56;
const RAIO_PONTO = 4;
const TRACO_REFERENCIA = { dashWidth: 4, dashGap: 3 };

/** Ponto de baixa precisão: vazado, com o miolo na cor do cartão (research R5). */
function pontoVazado(cor: string) {
  return function PontoVazado() {
    return (
      <View
        style={{
          width: RAIO_PONTO * 2,
          height: RAIO_PONTO * 2,
          borderRadius: RAIO_PONTO,
          borderWidth: 2,
          borderColor: cor,
          backgroundColor: cores.cartao,
        }}
      />
    );
  };
}

function Legenda({ grafico }: { grafico: Grafico }) {
  const temBaixaPrecisao = grafico.linhas.some((l) => l.pontos.some((p) => p?.baixaPrecisao));
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-1">
      {grafico.linhas.map((linha) => (
        <View key={linha.nome} className="flex-row items-center gap-1">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: cores.grafico[linha.cor] }}
          />
          <Text className="text-xs text-textoSecundario">{linha.nome}</Text>
        </View>
      ))}
      {temBaixaPrecisao ? (
        <Text className="text-xs text-textoSecundario">○ baixa precisão</Text>
      ) : null}
      <Text className="text-xs text-textoSecundario">{grafico.unidade}</Text>
    </View>
  );
}

/** Evolução de um protocolo ou do LSI sobre o LineChart; os dados vêm prontos de evolucao.ts. */
export function GraficoEvolucao({ grafico }: { grafico: Grafico }) {
  if (!temPontosSuficientes(grafico)) {
    return <Text className="text-sm text-textoSecundario">{MENSAGEM_INSUFICIENTE}</Text>;
  }
  const { deslocamento, maximo } = escalaDoGrafico(grafico);
  const estiloRotulo = { color: cores.grafico.eixo, fontSize: 10 };
  const dataSet = grafico.linhas.map((linha, indiceLinha) => {
    const cor = cores.grafico[linha.cor];
    return {
      color: cor,
      dataPointsColor: cor,
      data: linha.pontos.map((ponto, i) => ({
        value: ponto?.valor,
        label: indiceLinha === 0 ? rotuloDoEixo(grafico.eixo[i]) : undefined,
        labelTextStyle: estiloRotulo,
        hideDataPoint: ponto === null,
        customDataPoint: ponto?.baixaPrecisao ? pontoVazado(cor) : undefined,
      })),
    };
  });

  return (
    <View className="gap-2">
      <LineChart
        dataSet={dataSet}
        height={ALTURA_GRAFICO}
        spacing={ESPACO_ENTRE_PONTOS}
        noOfSections={SECOES_EIXO_Y}
        yAxisOffset={deslocamento}
        maxValue={maximo}
        dataPointsRadius={RAIO_PONTO}
        interpolateMissingValues
        showDataPointsForMissingValues={false}
        yAxisTextStyle={estiloRotulo}
        xAxisLabelTextStyle={estiloRotulo}
        yAxisColor={cores.borda}
        xAxisColor={cores.borda}
        rulesColor={cores.borda}
        showReferenceLine1={grafico.referencia !== null}
        referenceLine1Position={grafico.referencia ?? undefined}
        referenceLine1Config={{ color: cores.grafico.referencia, ...TRACO_REFERENCIA }}
      />
      <Legenda grafico={grafico} />
    </View>
  );
}
