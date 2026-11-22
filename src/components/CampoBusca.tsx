import { TextInput } from 'react-native';

import cores from '@/theme/cores';

export function CampoBusca({
  valor,
  aoMudar,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <TextInput
      accessibilityLabel="Buscar por nome"
      placeholder="Buscar por nome"
      placeholderTextColor={cores.textoSecundario}
      value={valor}
      onChangeText={aoMudar}
      autoCorrect={false}
      className="rounded-xl border border-borda bg-cartao px-3 py-3 text-base text-texto"
    />
  );
}
