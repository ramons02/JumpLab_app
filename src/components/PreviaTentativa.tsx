import { Text, View } from 'react-native';

import type { NumeroTentativa, PernaTentativa } from '@/types/attempt';
import type { MedidaTentativa } from '@/types/resultadoSalto';
import {
  CASAS_ALTURA,
  CASAS_MARGEM,
  CASAS_RSI,
  CASAS_TEMPO_MS,
  formatarDecimal,
} from '@/utils/formatacao';
import { ROTULO_PERNA } from '@/utils/rotulos';

interface PreviaTentativaProps {
  medida: MedidaTentativa;
  numero: NumeroTentativa;
  perna: PernaTentativa;
}

/** Medidas da tentativa marcada, antes do resultado (spec 007); números de biomechanics.ts. */
export function PreviaTentativa({ medida, numero, perna }: PreviaTentativaProps) {
  const titulo = `Prévia · tentativa ${numero}${
    perna === 'unica' ? '' : ` · perna ${ROTULO_PERNA[perna].toLowerCase()}`
  }`;
  return (
    <View testID="previa-tentativa" className="gap-1 rounded-2xl bg-cartao p-3">
      <Text className="text-[11px] uppercase text-textoSecundario">{titulo}</Text>
      <View className="flex-row flex-wrap items-baseline gap-x-1">
        <Text className="text-sm text-texto">Altura</Text>
        <Text className="text-sm font-bold text-texto">
          {formatarDecimal(medida.alturaCm, CASAS_ALTURA)} cm
        </Text>
        <Text className="text-sm text-texto">
          (±{formatarDecimal(medida.margemCm, CASAS_MARGEM)}) · voo
        </Text>
        <Text className="text-sm text-texto">
          {formatarDecimal(medida.tempoVooMs, CASAS_TEMPO_MS)} ms
        </Text>
        {medida.tempoContatoMs !== null ? (
          <>
            <Text className="text-sm text-texto">· contato</Text>
            <Text className="text-sm text-texto">
              {formatarDecimal(medida.tempoContatoMs, CASAS_TEMPO_MS)} ms
            </Text>
          </>
        ) : null}
        {medida.rsi !== null ? (
          <>
            <Text className="text-sm text-texto">· RSI</Text>
            <Text className="text-sm font-bold text-texto">
              {formatarDecimal(medida.rsi, CASAS_RSI)}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
