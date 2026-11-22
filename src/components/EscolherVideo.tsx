import { Pressable, Text, View } from 'react-native';

import { TENTATIVAS_POR_PERNA } from '@/utils/tentativas';

interface EscolherVideoProps {
  numero: number;
  mensagem: string | null;
  aoEscolher: () => void;
}

export function EscolherVideo({ numero, mensagem, aoEscolher }: EscolherVideoProps) {
  return (
    <View className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
      <Text className="text-sm font-semibold text-texto">
        Vídeo do salto · tentativa {numero} de {TENTATIVAS_POR_PERNA}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={aoEscolher}
        className="items-center rounded-2xl bg-destaque py-4"
      >
        <Text className="text-sm font-semibold text-fundo">Escolher vídeo da galeria</Text>
      </Pressable>
      {mensagem ? (
        <Text accessibilityRole="alert" className="text-xs text-erro">
          {mensagem}
        </Text>
      ) : null}
    </View>
  );
}
