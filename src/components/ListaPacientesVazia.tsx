import { Text, View } from 'react-native';

import { BotaoNovoPaciente } from '@/components/BotaoNovoPaciente';

interface ListaPacientesVaziaProps {
  /** true: nenhum paciente cadastrado; false: há pacientes, mas nenhum atende filtro e busca. */
  semCadastro: boolean;
  aoNovo: () => void;
}

export function ListaPacientesVazia({ semCadastro, aoNovo }: ListaPacientesVaziaProps) {
  return (
    <View className="mt-12 items-center gap-4">
      <Text className="text-center text-sm text-textoSecundario">
        {semCadastro ? 'Nenhum paciente cadastrado ainda.' : 'Nenhum paciente encontrado.'}
      </Text>
      <BotaoNovoPaciente aoTocar={aoNovo} />
    </View>
  );
}
