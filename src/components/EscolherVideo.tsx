import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { PernaTentativa } from '@/types/attempt';
import { TENTATIVAS_POR_PERNA } from '@/utils/tentativas';

interface EscolherVideoProps {
  perna: PernaTentativa;
  numero: number;
  mensagem: string | null;
  aoEscolher: () => void;
}

/** Estado sem vídeo da tentativa: escolher da galeria ou gravar pela câmera do app (spec 011). */
export function EscolherVideo({ perna, numero, mensagem, aoEscolher }: EscolherVideoProps) {
  const router = useRouter();
  const gravar = () =>
    router.push({ pathname: '/assessment/camera', params: { perna, tentativa: String(numero) } });
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
      <Pressable
        accessibilityRole="button"
        onPress={gravar}
        className="items-center rounded-2xl border border-destaque py-4"
      >
        <Text className="text-sm font-semibold text-destaque">Gravar com a câmera</Text>
      </Pressable>
      {mensagem ? (
        <Text accessibilityRole="alert" className="text-xs text-erro">
          {mensagem}
        </Text>
      ) : null}
    </View>
  );
}
