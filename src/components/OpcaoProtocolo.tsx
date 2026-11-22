import { Pressable, Text, View } from 'react-native';

import type { Protocol } from '@/types/protocol';
import { PROTOCOLOS } from '@/utils/protocolos';

interface OpcaoProtocoloProps {
  protocolo: Protocol;
  selecionado: boolean;
  aoEscolher: () => void;
}

/** Botão de escolha única de um protocolo: marcador, nome e descrição. */
export function OpcaoProtocolo({ protocolo, selecionado, aoEscolher }: OpcaoProtocoloProps) {
  const { nome, descricao } = PROTOCOLOS[protocolo];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={nome}
      accessibilityState={{ checked: selecionado }}
      onPress={aoEscolher}
      className={`flex-row items-start gap-3 rounded-2xl border p-3 ${
        selecionado ? 'border-destaque bg-destaqueFundo' : 'border-borda bg-cartao'
      }`}
    >
      <View
        className={`mt-0.5 h-5 w-5 items-center justify-center rounded-full border-2 ${
          selecionado ? 'border-destaque' : 'border-textoSecundario'
        }`}
      >
        {selecionado ? <View className="h-2.5 w-2.5 rounded-full bg-destaque" /> : null}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-texto">{nome}</Text>
        <Text className="text-xs text-textoSecundario">{descricao}</Text>
      </View>
    </Pressable>
  );
}
