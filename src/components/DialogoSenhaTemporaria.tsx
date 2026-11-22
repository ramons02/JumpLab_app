import { Linking, Modal, Pressable, Text, View } from 'react-native';

import type { SenhaTemporariaGerada } from '@/types/conta';
import { montarLinkWhatsapp, montarMensagemSenhaTemporaria } from '@/utils/mensagemWhatsapp';

/** Mostra a senha uma única vez; ao fechar, ela some do app (FR-007). */
export function DialogoSenhaTemporaria({
  gerada,
  aoFechar,
}: {
  gerada: SenhaTemporariaGerada | null;
  aoFechar: () => void;
}) {
  if (!gerada) return null;
  const enviar = () =>
    Linking.openURL(montarLinkWhatsapp(montarMensagemSenhaTemporaria(gerada.senhaTemporaria)));
  return (
    <Modal transparent animationType="fade" onRequestClose={aoFechar}>
      <View className="flex-1 items-center justify-center bg-black/70 p-6">
        <View className="w-full gap-3 rounded-2xl border border-borda bg-cartao p-5">
          <Text className="text-base font-semibold text-texto">Senha temporária gerada</Text>
          <Text className="text-sm text-texto">
            Para {gerada.email}: <Text className="font-bold">{gerada.senhaTemporaria}</Text>. Vale
            24 horas e uma única entrada; no primeiro acesso o usuário cria a senha nova.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={enviar}
            className="items-center rounded-2xl bg-destaque py-3"
          >
            <Text className="text-sm font-semibold text-fundo">Enviar pelo WhatsApp</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={aoFechar}
            className="items-center rounded-2xl border border-borda py-3"
          >
            <Text className="text-sm font-semibold text-texto">Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
