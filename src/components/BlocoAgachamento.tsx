import { Text, View } from 'react-native';

import { CartaoMedida, type CorCartao } from '@/components/CartaoMedida';
import type { CorPerda, ResultadoAgachamento } from '@/types/squat';
import { corPerda } from '@/utils/biomechanics';
import {
  CASAS_AMPLITUDE,
  formatarCarga,
  CASAS_PERDA,
  CASAS_POTENCIA,
  CASAS_TEMPO_AGACH_S,
  CASAS_VELOCIDADE,
  formatarDecimal,
} from '@/utils/formatacao';
import { ESTILO_SEMAFORO } from '@/theme/semaforoLsi';

const COR_CARTAO: Record<CorPerda, CorCartao | undefined> = {
  verde: 'verde',
  amarelo: 'amarelo',
  vermelho: 'vermelho',
  neutro: undefined,
};

/** Resultado da série: cartões, barras da velocidade por repetição e tabela por repetição. */
export function BlocoAgachamento({ resumo }: { resumo: ResultadoAgachamento }) {
  const cor = corPerda(resumo.perdaVelocidadePct);
  const ultima = resumo.repeticoes.length - 1;
  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        <CartaoMedida rotulo="Carga" valor={formatarCarga(resumo.cargaKg)} unidade="kg" />
        <CartaoMedida rotulo="Repetições" valor={String(resumo.repeticoes.length)} />
      </View>
      <View className="flex-row gap-2">
        <CartaoMedida
          rotulo="Melhor velocidade"
          valor={formatarDecimal(resumo.melhorVelocidadeMs, CASAS_VELOCIDADE)}
          unidade="m/s"
        />
        <CartaoMedida
          rotulo="Perda de velocidade"
          valor={
            resumo.perdaVelocidadePct === null
              ? '-'
              : `${formatarDecimal(resumo.perdaVelocidadePct, CASAS_PERDA)}%`
          }
          cor={COR_CARTAO[cor]}
        />
      </View>
      <View className="flex-row">
        <CartaoMedida
          rotulo="Melhor potência"
          valor={formatarDecimal(resumo.melhorPotenciaW, CASAS_POTENCIA)}
          unidade="W"
        />
      </View>

      <View className="gap-2 rounded-2xl border border-borda bg-cartao p-4">
        <Text className="text-sm font-semibold text-texto">Velocidade da subida por repetição</Text>
        {resumo.repeticoes.map((r, indice) => (
          <View key={r.numero} className="flex-row items-center gap-2">
            <Text className="w-12 text-xs text-textoSecundario">Rep {r.numero}</Text>
            <View className="h-3 flex-1 rounded-full bg-borda">
              <View
                testID={`barra-rep-${r.numero}`}
                className={`h-3 rounded-full ${indice === ultima ? ESTILO_SEMAFORO[cor].barra : 'bg-destaque'}`}
                style={{ width: `${(r.velocidadeMs / resumo.melhorVelocidadeMs) * 100}%` }}
              />
            </View>
            <Text className="w-16 text-right text-xs text-texto">
              {formatarDecimal(r.velocidadeMs, CASAS_VELOCIDADE)} m/s
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-1 rounded-2xl border border-borda bg-cartao p-4">
        <View className="flex-row">
          {['Rep', 'Amplitude', 'Descida', 'Subida', 'Potência'].map((titulo) => (
            <Text key={titulo} className="flex-1 text-[11px] font-semibold text-textoSecundario">
              {titulo}
            </Text>
          ))}
        </View>
        {resumo.repeticoes.map((r) => (
          <View key={r.numero} testID={`linha-rep-${r.numero}`} className="flex-row">
            <Text className="flex-1 text-xs text-texto">{r.numero}</Text>
            <Text className="flex-1 text-xs text-texto">
              {formatarDecimal(r.amplitudeCm, CASAS_AMPLITUDE)} cm
            </Text>
            <Text className="flex-1 text-xs text-texto">
              {formatarDecimal(r.descidaS, CASAS_TEMPO_AGACH_S)} s
            </Text>
            <Text className="flex-1 text-xs text-texto">
              {formatarDecimal(r.subidaS, CASAS_TEMPO_AGACH_S)} s
            </Text>
            <Text className="flex-1 text-xs text-texto">
              {formatarDecimal(r.potenciaW, CASAS_POTENCIA)} W
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
