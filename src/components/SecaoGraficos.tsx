import { Text, View } from 'react-native';

import { GraficoEvolucao } from '@/components/GraficoEvolucao';
import type { AvaliacaoDoHistorico } from '@/types/assessment';
import type { PernaLesionada } from '@/types/patient';
import {
  montarGraficoLsi,
  montarGraficoProtocolo,
  protocolosAvaliados,
  type GraficoEvolucao as Grafico,
} from '@/utils/evolucao';

function Cartao({ grafico, testID }: { grafico: Grafico; testID: string }) {
  return (
    <View testID={testID} className="gap-2 rounded-2xl border border-borda bg-cartao p-4">
      <Text className="text-sm font-semibold text-texto">
        {grafico.titulo} · {grafico.medida}
      </Text>
      <GraficoEvolucao grafico={grafico} />
    </View>
  );
}

/** Um cartão por protocolo avaliado e, por último, a simetria (LSI) quando houver unilateral (HU009). */
export function SecaoGraficos({
  avaliacoes,
  pernaLesionada,
}: {
  avaliacoes: AvaliacaoDoHistorico[];
  pernaLesionada: PernaLesionada;
}) {
  if (avaliacoes.length === 0) return null;
  const lsi = montarGraficoLsi(avaliacoes);
  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-textoSecundario">Evolução</Text>
      {protocolosAvaliados(avaliacoes).map((protocolo) => (
        <Cartao
          key={protocolo}
          testID={`grafico-${protocolo}`}
          grafico={montarGraficoProtocolo(protocolo, avaliacoes, pernaLesionada)}
        />
      ))}
      {lsi ? <Cartao testID="grafico-lsi" grafico={lsi} /> : null}
    </View>
  );
}
