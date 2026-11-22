import { Text, TextInput, View, type TextInputProps } from 'react-native';

import cores from '@/theme/cores';

interface CampoTextoProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  /** Texto de ajuda abaixo do rótulo. */
  dica?: string;
  /** Conteúdo mostrado à direita, dentro do campo (ex.: a idade calculada). */
  complemento?: React.ReactNode;
}

export function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  erro,
  dica,
  complemento,
  ...props
}: CampoTextoProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-texto">{rotulo}</Text>
      {dica ? <Text className="-mt-1 text-xs text-textoSecundario">{dica}</Text> : null}
      <View
        className={`flex-row items-center rounded-xl border bg-cartao px-3 ${erro ? 'border-erro' : 'border-borda'}`}
      >
        <TextInput
          accessibilityLabel={rotulo}
          className="flex-1 py-3 text-base text-texto"
          placeholderTextColor={cores.textoSecundario}
          value={valor}
          onChangeText={aoMudar}
          {...props}
        />
        {complemento}
      </View>
      {erro ? <Text className="text-xs text-erro">{erro}</Text> : null}
    </View>
  );
}
