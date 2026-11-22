import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface CampoTextoProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  /** Conteúdo mostrado à direita, dentro do campo (ex.: a idade calculada). */
  complemento?: React.ReactNode;
}

export function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  erro,
  complemento,
  ...props
}: CampoTextoProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-texto">{rotulo}</Text>
      <View
        className={`flex-row items-center rounded-xl border bg-superficie px-3 ${erro ? 'border-erro' : 'border-borda'}`}
      >
        <TextInput
          accessibilityLabel={rotulo}
          className="flex-1 py-3 text-base text-texto"
          placeholderTextColor="#6b7a74"
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
