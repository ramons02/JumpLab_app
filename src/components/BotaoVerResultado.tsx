import { Pressable, Text, View } from 'react-native';

/** Linhas de pendência mostradas de uma vez; o resto vira "e mais N". */
export const PENDENCIAS_VISIVEIS = 3;

interface BotaoVerResultadoProps {
  pronto: boolean;
  aoTocar: () => void;
  /** O que ainda falta, mostrado abaixo do botão enquanto ele está desabilitado. */
  pendencias?: string[];
}

/** Leva ao resultado só com todas as tentativas completas (HU007 RN15) e diz o que falta. */
export function BotaoVerResultado({ pronto, aoTocar, pendencias = [] }: BotaoVerResultadoProps) {
  const visiveis = pendencias.slice(0, PENDENCIAS_VISIVEIS);
  const restantes = pendencias.length - visiveis.length;
  return (
    <View className="gap-2">
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
      {!pronto && visiveis.length > 0 ? (
        <View testID="pendencias-resultado" className="gap-0.5">
          <Text className="text-xs font-semibold text-textoSecundario">
            Para ver o resultado, falta:
          </Text>
          {visiveis.map((linha) => (
            <Text key={linha} className="text-xs text-aviso">
              • {linha}
            </Text>
          ))}
          {restantes > 0 ? (
            <Text className="text-xs text-textoSecundario">e mais {restantes}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
