import { Text, View } from 'react-native';

/** Selo das medidas com alguma tentativa filmada a 60 fps (D3). */
export function SeloBaixaPrecisao() {
  return (
    <View className="self-start rounded-full bg-aviso-fundo px-3 py-1">
      <Text className="text-xs font-semibold text-aviso">Baixa precisão (60 fps)</Text>
    </View>
  );
}
