import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormularioPaciente } from '@/components/FormularioPaciente';
import { atualizarPaciente, buscarPaciente } from '@/database/pacientes';
import type { DadosPaciente, Patient } from '@/types/patient';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Carga =
  { estado: 'carregando' } | { estado: 'encontrado'; paciente: Patient } | { estado: 'ausente' };

export default function TelaEditarPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const idValido = typeof id === 'string' && UUID.test(id);
  const [carga, setCarga] = useState<Carga>({ estado: 'carregando' });

  useEffect(() => {
    if (!idValido) return;
    let ativo = true;
    buscarPaciente(db, id).then((paciente) => {
      if (ativo) setCarga(paciente ? { estado: 'encontrado', paciente } : { estado: 'ausente' });
    });
    return () => {
      ativo = false;
    };
  }, [db, id, idValido]);

  const gravar = useCallback(
    async (dados: DadosPaciente) => {
      await atualizarPaciente(db, id, dados);
    },
    [db, id],
  );

  if (!idValido || carga.estado === 'ausente')
    return <PacienteNaoEncontrado aoVoltar={() => router.back()} />;
  if (carga.estado === 'carregando') return <View className="flex-1 bg-fundo" />;

  return (
    <FormularioPaciente
      gravar={gravar}
      aoSalvar={() => router.back()}
      pacienteInicial={carga.paciente}
    />
  );
}

function PacienteNaoEncontrado({ aoVoltar }: { aoVoltar: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-fundo p-6">
      <Text className="text-center text-base text-texto">Paciente não encontrado.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={aoVoltar}
        className="rounded-2xl bg-destaque px-6 py-3"
      >
        <Text className="font-semibold text-fundo">Voltar</Text>
      </Pressable>
    </View>
  );
}
