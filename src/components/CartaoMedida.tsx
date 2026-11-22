import { Text, View } from 'react-native';

export type CorCartao = 'verde' | 'amarelo' | 'vermelho';

interface CartaoMedidaProps {
  rotulo: string;
  /** null = ainda não há medida ("Sem avaliações") */
  valor: string | null;
  unidade?: string;
  rodape?: string;
  cor?: CorCartao;
}

const ESTILO_POR_COR: Record<CorCartao, { caixa: string; valor: string }> = {
  verde: { caixa: 'border-destaque bg-destaqueFundo', valor: 'text-destaque' },
  amarelo: { caixa: 'border-aviso bg-aviso-fundo', valor: 'text-aviso' },
  vermelho: { caixa: 'border-erro bg-erro-fundo', valor: 'text-erro' },
};

/** Card de uma medida do resumo; compartilhado com a spec 008, que acrescenta as tentativas. */
export function CartaoMedida({ rotulo, valor, unidade, rodape, cor }: CartaoMedidaProps) {
  const estilo = cor
    ? ESTILO_POR_COR[cor]
    : { caixa: 'border-borda bg-cartao', valor: 'text-texto' };
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
    </View>
  );
}
