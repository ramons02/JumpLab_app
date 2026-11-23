import { Image, Pressable, Text, View } from 'react-native';

interface FitaDeQuadrosProps {
  quadros: number[];
  atual: number;
  miniaturas: Record<number, string>;
  desabilitada: boolean;
  aoEscolher(quadro: number): void;
}

/**
 * Fita de quadros vizinhos (D23): miniaturas de até 3 quadros antes e 3 depois do atual, com o número
 * de cada um. Tocar numa leva àquele quadro. Sem a imagem ainda, mostra só o número.
 */
export function FitaDeQuadros({
  quadros,
  atual,
  miniaturas,
  desabilitada,
  aoEscolher,
}: FitaDeQuadrosProps) {
  return (
    <View testID="fita-quadros" className={`flex-row gap-1 ${desabilitada ? 'opacity-40' : ''}`}>
      {quadros.map((q) => {
        const ehAtual = q === atual;
        const imagem = miniaturas[q];
        return (
          <Pressable
            key={q}
            accessibilityRole="button"
            accessibilityLabel={`Mostrar o quadro ${q}`}
            accessibilityState={{ disabled: desabilitada, selected: ehAtual }}
            disabled={desabilitada}
            onPress={() => aoEscolher(q)}
            className={`h-12 flex-1 overflow-hidden rounded-md bg-cartao ${
              ehAtual ? 'border-2 border-destaque' : 'border border-borda'
            }`}
          >
            {imagem ? (
              <Image
                testID={`miniatura-${q}`}
                source={{ uri: imagem }}
                resizeMode="cover"
                style={{ flex: 1 }}
              />
            ) : null}
            <Text
              className={`absolute inset-x-0 bottom-0 bg-fundo/70 text-center text-[10px] ${
                ehAtual ? 'font-bold text-destaque' : 'text-textoSecundario'
              }`}
            >
              {q}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
