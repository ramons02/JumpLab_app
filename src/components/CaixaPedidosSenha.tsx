import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DialogoSenhaTemporaria } from '@/components/DialogoSenhaTemporaria';
import { useCaixaPedidos } from '@/hooks/useCaixaPedidos';
import type { PedidoRecuperacao, SenhaTemporariaGerada } from '@/types/conta';
import { instanteParaBr } from '@/utils/datas';

export const MENSAGEM_SEM_PEDIDOS = 'Nenhum pedido de recuperação.';

function LinhaPedido({ pedido, aoGerar }: { pedido: PedidoRecuperacao; aoGerar: () => void }) {
  return (
    <View className="flex-row items-center justify-between gap-3 border-t border-borda pt-3">
      <View className="flex-1">
        <Text className="text-sm text-texto">{pedido.email}</Text>
        <Text className="text-xs text-textoSecundario">{instanteParaBr(pedido.pedidoEm)}</Text>
      </View>
      {pedido.status === 'aberto' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Gerar senha para ${pedido.email}`}
          onPress={aoGerar}
          className="rounded-xl bg-destaque px-3 py-2"
        >
          <Text className="text-xs font-semibold text-fundo">Gerar senha</Text>
        </Pressable>
      ) : (
        <Text className="text-xs text-textoSecundario">Atendido</Text>
      )}
    </View>
  );
}

/** Caixa do administrador em Configurações (spec 016, HU016 RN05). */
export function CaixaPedidosSenha() {
  const { erro, pedidos, abertos, gerar } = useCaixaPedidos(true);
  const [gerada, setGerada] = useState<SenhaTemporariaGerada | null>(null);

  async function gerarPara(id: number) {
    const resultado = await gerar(id);
    if (resultado) setGerada(resultado);
  }

  return (
    <View testID="caixa-pedidos" className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
      <Text className="text-sm font-semibold text-texto">
        Administração · pedidos de senha ({abertos})
      </Text>
      {erro ? <Text className="text-xs text-erro">{erro}</Text> : null}
      {pedidos.length === 0 && !erro ? (
        <Text className="text-xs text-textoSecundario">{MENSAGEM_SEM_PEDIDOS}</Text>
      ) : null}
      {pedidos.map((pedido) => (
        <LinhaPedido key={pedido.id} pedido={pedido} aoGerar={() => void gerarPara(pedido.id)} />
      ))}
      <DialogoSenhaTemporaria gerada={gerada} aoFechar={() => setGerada(null)} />
    </View>
  );
}
