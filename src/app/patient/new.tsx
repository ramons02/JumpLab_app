import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

import { FormularioPaciente } from '@/components/FormularioPaciente';
import { inserirPaciente } from '@/database/pacientes';
import type { DadosPaciente } from '@/types/patient';

export default function TelaNovoPaciente() {
  const db = useSQLiteContext();
  const router = useRouter();

  const gravar = useCallback(
    async (dados: DadosPaciente) => {
      await inserirPaciente(db, dados);
    },
    [db],
  );

  return <FormularioPaciente gravar={gravar} aoSalvar={() => router.back()} />;
}
