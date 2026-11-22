import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { listarPacientes } from '@/database/pacientes';
import type { Patient } from '@/types/patient';
import { calcularIdade, hojeIso } from '@/utils/datas';
import { ROTULO_PERFIL } from '@/utils/rotulos';

function ItemPaciente({ paciente, hoje }: { paciente: Patient; hoje: string }) {
  return (
    <View className="mb-2 rounded-2xl border border-borda bg-superficie p-3">
      <Text className="font-semibold text-texto">{paciente.nome}</Text>
      <Text className="mt-0.5 text-xs text-texto-suave">
        {ROTULO_PERFIL[paciente.perfil]} · {calcularIdade(paciente.dataNascimento, hoje)} anos
      </Text>
    </View>
  );
}

function BotaoNovoPaciente() {
  return (
    <Link href="/patient/new" asChild>
      <Pressable accessibilityRole="button" className="items-center rounded-2xl bg-marca px-5 py-4">
        <Text className="text-sm font-semibold text-fundo">+ Novo Paciente</Text>
      </Pressable>
    </Link>
  );
}

/** Lista mínima da HU001; busca, filtros e última avaliação chegam com a HU002. */
export default function TelaPacientes() {
  const db = useSQLiteContext();
  const [pacientes, setPacientes] = useState<Patient[] | null>(null);
  const hoje = hojeIso();

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarPacientes(db).then((lista) => {
        if (ativo) setPacientes(lista);
      });
      return () => {
        ativo = false;
      };
    }, [db]),
  );

  if (pacientes === null) return <View className="flex-1 bg-fundo" />;

  return (
    <View className="flex-1 bg-fundo">
      <FlatList
        data={pacientes}
        keyExtractor={(paciente) => paciente.id}
        renderItem={({ item }) => <ItemPaciente paciente={item} hoje={hoje} />}
        contentContainerClassName="p-4 pb-28"
        ListEmptyComponent={
          <Text className="mt-16 text-center text-sm text-texto-suave">
            Nenhum paciente cadastrado ainda.
          </Text>
        }
      />
      <View className="absolute bottom-4 right-4">
        <BotaoNovoPaciente />
      </View>
    </View>
  );
}
