import { Pressable, Text, View } from 'react-native';

interface SeletorOpcoesProps<T extends string> {
  rotulo: string;
  opcoes: readonly (readonly [T, string])[];
  valor: T | '';
  aoMudar: (valor: T) => void;
  erro?: string;
}

/** Botões de escolha única, lado a lado. */
export function SeletorOpcoes<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  erro,
}: SeletorOpcoesProps<T>) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-texto">{rotulo}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={rotulo} className="flex-row gap-2">
        {opcoes.map(([opcao, texto]) => {
          const selecionada = opcao === valor;
          return (
            <Pressable
              key={opcao}
              accessibilityRole="radio"
              accessibilityState={{ checked: selecionada }}
              onPress={() => aoMudar(opcao)}
              className={`flex-1 items-center rounded-xl border py-3 ${
                selecionada
                  ? 'border-destaque bg-destaqueFundo'
                  : erro
                    ? 'border-erro bg-cartao'
                    : 'border-borda bg-cartao'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${selecionada ? 'text-destaque' : 'text-textoSecundario'}`}
              >
                {texto}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {erro ? <Text className="text-xs text-erro">{erro}</Text> : null}
    </View>
  );
}
