import { Text, View } from 'react-native';

import type { Patient } from '@/types/patient';
import { paraBr } from '@/utils/datas';
import { ROTULO_PERNA } from '@/utils/rotulos';

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-sm text-textoSecundario">{rotulo}</Text>
      <Text className="text-sm text-texto">{valor}</Text>
    </View>
  );
}

/** Nascimento, perna lesionada e a data da cirurgia (Pós-LCA) ou da lesão (Corredor). */
export function DadosPaciente({ paciente }: { paciente: Patient }) {
  return (
    <View className="rounded-2xl border border-borda bg-cartao p-4">
      <Linha rotulo="Nascimento" valor={paraBr(paciente.dataNascimento)} />
      <Linha rotulo="Perna lesionada" valor={ROTULO_PERNA[paciente.pernaLesionada]} />
      <Linha
        rotulo={paciente.perfil === 'pos_lca' ? 'Cirurgia' : 'Lesão'}
        valor={paciente.dataLesao ? paraBr(paciente.dataLesao) : 'Não informada'}
      />
    </View>
  );
}
