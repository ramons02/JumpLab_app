import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listarPacientesComUltimaAvaliacao } from '@/database/pacientes';
import type { PacienteNaLista } from '@/types/patient';

/** Todos os pacientes, sem filtro, recarregados sempre que a tela ganha foco (FR-011). */
export function useListaPacientes(): { pacientes: PacienteNaLista[]; carregando: boolean } {
  const db = useSQLiteContext();
  const [pacientes, setPacientes] = useState<PacienteNaLista[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarPacientesComUltimaAvaliacao(db).then((lista) => {
        if (ativo) setPacientes(lista);
      });
      return () => {
        ativo = false;
      };
    }, [db]),
  );

  return { pacientes: pacientes ?? [], carregando: pacientes === null };
}
