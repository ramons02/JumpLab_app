import { Pressable, Text } from 'react-native';

/** Leva ao resultado só com todas as tentativas completas (HU007 RN15). */
export function BotaoVerResultado({ pronto, aoTocar }: { pronto: boolean; aoTocar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !pronto }}
      disabled={!pronto}
      onPress={aoTocar}
      className={`items-center rounded-2xl py-4 ${pronto ? 'bg-destaque' : 'bg-destaqueFundo'}`}
    >
      <Text className={`font-semibold ${pronto ? 'text-fundo' : 'text-textoSecundario'}`}>
        Ver resultado
      </Text>
    </Pressable>
  );
}
