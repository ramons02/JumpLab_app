import { Text, View } from 'react-native';

/**
 * Linha vertical no centro da imagem, para o avaliador alinhar o corpo e conferir o quadro. Usada no
 * analisador (spec 006) e na câmera (spec 011); não recebe toques.
 */
export function LinhaGuia() {
  return (
    <>
      <View
        testID="linha-guia"
        accessibilityLabel="linha guia"
        pointerEvents="none"
        className="absolute bottom-0 left-1/2 top-0 w-0.5 bg-guia opacity-90"
      />
      <View
        pointerEvents="none"
        className="absolute left-2 top-2 rounded bg-fundo/70 px-1.5 py-0.5"
      >
        <Text className="text-[10px] text-texto">linha guia</Text>
      </View>
    </>
  );
}
