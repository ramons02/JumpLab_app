import { Text, View } from 'react-native';

const SEGUNDOS_POR_MINUTO = 60;

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

/** `REC mm:ss · N fps` sobre a imagem enquanto grava (FR-009). */
export function IndicadorGravacao({ segundos, taxa }: { segundos: number; taxa: number }) {
  const minutos = Math.floor(segundos / SEGUNDOS_POR_MINUTO);
  const resto = segundos % SEGUNDOS_POR_MINUTO;
  return (
    <View
      pointerEvents="none"
      className="absolute left-3 top-10 flex-row items-center gap-1.5 rounded-full bg-erro px-2.5 py-1"
    >
      <View className="h-2 w-2 rounded-full bg-texto" />
      <Text className="text-xs font-semibold text-texto">
        REC {doisDigitos(minutos)}:{doisDigitos(resto)} · {taxa} fps
      </Text>
    </View>
  );
}
