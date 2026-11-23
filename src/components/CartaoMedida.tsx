import { Text, View } from 'react-native';

import { ESTILO_SEMAFORO } from '@/theme/semaforoLsi';

export type CorCartao = 'verde' | 'amarelo' | 'vermelho';

interface CartaoMedidaProps {
  rotulo: string;
  /** null = ainda não há medida ("Sem avaliações") */
  valor: string | null;
  unidade?: string;
  rodape?: string;
  cor?: CorCartao;
  /** Valores já formatados de cada tentativa, mostrados abaixo da média (spec 008). */
  tentativas?: string[];
}

/** Card de uma medida do resumo; compartilhado com a spec 008, que acrescenta as tentativas. */
export function CartaoMedida({
  rotulo,
  valor,
  unidade,
  rodape,
  cor,
  tentativas,
}: CartaoMedidaProps) {
  const estilo = ESTILO_SEMAFORO[cor ?? 'neutro'];
  return (
    <View className={`flex-1 rounded-2xl border p-3 ${estilo.caixa}`}>
      <Text className="text-xs font-medium text-textoSecundario">{rotulo}</Text>
      {valor === null ? (
        <Text className="mt-1 text-base font-semibold text-textoSecundario">Sem avaliações</Text>
      ) : (
        <Text className={`mt-1 text-xl font-bold ${estilo.valor}`}>
          {valor}
          {unidade ? (
            <Text className="text-sm font-medium text-textoSecundario"> {unidade}</Text>
          ) : null}
        </Text>
      )}
      {rodape ? <Text className="mt-0.5 text-xs text-textoSecundario">{rodape}</Text> : null}
      {tentativas?.length ? (
        <View className="mt-2 gap-0.5 border-t border-borda pt-2">
          {tentativas.map((texto, indice) => (
            <View key={indice} className="flex-row justify-between">
              <Text className="text-xs text-textoSecundario">Tentativa {indice + 1}</Text>
              <Text className="text-xs text-texto">{texto}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
