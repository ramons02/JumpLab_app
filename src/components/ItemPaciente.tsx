import { Pressable, Text, View } from 'react-native';

import type { PacienteNaLista } from '@/types/patient';
import { calcularIdade, dataHoraParaBr } from '@/utils/datas';
import { ROTULO_PERFIL, ROTULO_PERNA } from '@/utils/rotulos';

interface ItemPacienteProps {
  paciente: PacienteNaLista;
  hoje: string;
  aoTocar: () => void;
}

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

export function ItemPaciente({ paciente, hoje, aoTocar }: ItemPacienteProps) {
  const idade = calcularIdade(paciente.dataNascimento, hoje);
  const perna = ROTULO_PERNA[paciente.pernaLesionada].toLowerCase();
  const ultima = paciente.ultimaAvaliacaoEm
    ? `Última avaliação em ${dataHoraParaBr(paciente.ultimaAvaliacaoEm)}`
    : 'Sem avaliações';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={aoTocar}
      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-borda bg-cartao p-3"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-destaqueFundo">
        <Text className="font-semibold text-destaque">{iniciais(paciente.nome)}</Text>
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="font-semibold text-texto">
          {paciente.nome}
        </Text>
        <Text className="mt-0.5 text-xs text-textoSecundario">
          {ROTULO_PERFIL[paciente.perfil]} · {idade} anos · perna lesionada: {perna}
        </Text>
        <Text className="mt-0.5 text-xs text-textoSecundario">{ultima}</Text>
      </View>
    </Pressable>
  );
}
