import { Pressable, Text, View } from 'react-native';

import type { FiltroPerfil as Filtro } from '@/types/patient';
import { ROTULO_PERFIL } from '@/utils/rotulos';

const OPCOES: readonly (readonly [Filtro, string])[] = [
  ['todos', 'Todos'],
  ['pos_lca', ROTULO_PERFIL.pos_lca],
  ['corredor', ROTULO_PERFIL.corredor],
];

export function FiltroPerfil({
  valor,
  aoMudar,
}: {
  valor: Filtro;
  aoMudar: (valor: Filtro) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Perfil" className="flex-row gap-2">
      {OPCOES.map(([opcao, rotulo]) => {
        const ativo = opcao === valor;
        return (
          <Pressable
            key={opcao}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
            onPress={() => aoMudar(opcao)}
            className={`rounded-full border px-4 py-2 ${ativo ? 'border-destaque bg-destaqueFundo' : 'border-borda bg-cartao'}`}
          >
            <Text
              className={`text-sm font-semibold ${ativo ? 'text-destaque' : 'text-textoSecundario'}`}
            >
              {rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
