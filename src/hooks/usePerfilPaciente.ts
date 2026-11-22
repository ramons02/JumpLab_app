import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { buscarPaciente } from '@/database/pacientes';
import type { Patient } from '@/types/patient';
import { ehUuid } from '@/utils/ids';

interface PerfilPaciente {
  paciente: Patient | null;
  carregando: boolean;
  naoEncontrado: boolean;
}

/**
 * Carrega o paciente do perfil e recarrega sempre que a tela ganha foco (ex.: na volta da edição).
 * Entrega 1 da HU003: ainda sem as avaliações, que chegam com a spec 008.
 */
export function usePerfilPaciente(id: string | undefined): PerfilPaciente {
  const db = useSQLiteContext();
  const idValido = typeof id === 'string' && ehUuid(id);
  const [paciente, setPaciente] = useState<Patient | null>(null);
  const [carregando, setCarregando] = useState(idValido);

  useFocusEffect(
    useCallback(() => {
      if (!idValido) return undefined;
      let ativo = true;
      buscarPaciente(db, id).then((encontrado) => {
        if (!ativo) return;
        setPaciente(encontrado);
        setCarregando(false);
      });
      return () => {
        ativo = false;
      };
    }, [db, id, idValido]),
  );

  return { paciente, carregando, naoEncontrado: !idValido || (!carregando && paciente === null) };
}
