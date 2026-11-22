import { Text, View } from 'react-native';

import { MENSAGEM_AVISO_FPS, type AvisoFps as TipoAviso } from '@/utils/fps';

/** Amarelo para baixa precisão (D3); vermelho para abaixo de 60 fps. */
export function AvisoFps({ aviso }: { aviso: TipoAviso }) {
  const baixaPrecisao = aviso === 'baixa_precisao';
  return (
    <View
      accessibilityRole="alert"
      className={`rounded-xl p-3 ${baixaPrecisao ? 'bg-aviso-fundo' : 'bg-erro-fundo'}`}
    >
      <Text className={`text-xs ${baixaPrecisao ? 'text-aviso' : 'text-erro'}`}>
        {MENSAGEM_AVISO_FPS[aviso]}
      </Text>
    </View>
  );
}
