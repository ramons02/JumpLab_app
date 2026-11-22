import { Text, View } from 'react-native';

import type { PernaLesionada } from '@/types/patient';
import type { CorLsi, ResumoLsi } from '@/types/resultadoSalto';
import { corLsi, LSI_LIMITE_AMARELO, LSI_LIMITE_VERDE } from '@/utils/biomechanics';
import { CASAS_LSI, formatarDecimal } from '@/utils/formatacao';
import { ROTULO_PERNA } from '@/utils/rotulos';

const ESTILO: Record<CorLsi, { caixa: string; valor: string }> = {
  verde: { caixa: 'border-destaque bg-destaqueFundo', valor: 'text-destaque' },
  amarelo: { caixa: 'border-aviso bg-aviso-fundo', valor: 'text-aviso' },
  vermelho: { caixa: 'border-erro bg-erro-fundo', valor: 'text-erro' },
  neutro: { caixa: 'border-borda bg-cartao', valor: 'text-texto' },
};

function explicacao(lsi: ResumoLsi, pernaLesionada: PernaLesionada): string {
  const base = lsi.base === 'rsi' ? 'pelo RSI' : 'pela altura';
  if (lsi.modo === 'lesionada' && pernaLesionada !== 'nenhuma') {
    return `Perna ${ROTULO_PERNA[pernaLesionada].toLowerCase()} (lesionada) ÷ perna sadia, ${base}.`;
  }
  const fraca = lsi.pernaMaisFraca ? ` (${ROTULO_PERNA[lsi.pernaMaisFraca].toLowerCase()})` : '';
  return `Perna mais fraca${fraca} ÷ mais forte, ${base}.`;
}

/** LSI com a cor do semáforo (D12), a base do cálculo e a perna de referência. */
export function CartaoLsi({
  lsi,
  pernaLesionada,
}: {
  lsi: ResumoLsi;
  pernaLesionada: PernaLesionada;
}) {
  const cor = corLsi(lsi.valor);
  const estilo = ESTILO[cor];
  return (
    <View testID="cartao-lsi" className={`gap-1 rounded-2xl border p-4 ${estilo.caixa}`}>
      <Text className="text-xs font-semibold text-textoSecundario">LSI (Índice de Simetria)</Text>
      {lsi.valor === null ? (
        <Text className="text-sm text-texto">
          Não foi possível calcular o LSI: a perna de referência mediu zero.
        </Text>
      ) : (
        <Text className={`text-4xl font-bold ${estilo.valor}`}>
          {formatarDecimal(lsi.valor, CASAS_LSI)}%
        </Text>
      )}
      <Text className="text-xs text-textoSecundario">
        {explicacao(lsi, pernaLesionada)} Verde a partir de {LSI_LIMITE_VERDE}%, amarelo de{' '}
        {LSI_LIMITE_AMARELO}% a {LSI_LIMITE_VERDE}%, vermelho abaixo de {LSI_LIMITE_AMARELO}%.
      </Text>
    </View>
  );
}
