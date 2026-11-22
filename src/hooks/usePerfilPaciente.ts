import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listarAvaliacoesDoPaciente } from '@/database/avaliacoes';
import { buscarPaciente } from '@/database/pacientes';
import type { AvaliacaoDoHistorico } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import { ehUuid } from '@/utils/ids';

interface PerfilPaciente {
  paciente: Patient | null;
  /** Da mais recente para a mais antiga (entrega 2). */
  avaliacoes: AvaliacaoDoHistorico[];
  carregando: boolean;
  naoEncontrado: boolean;
}

/**
 * Carrega o paciente e as avaliações dele e recarrega sempre que a tela ganha foco (na volta da
 * edição ou de uma avaliação salva). Um resultado_json inválido sobe como erro (spec 008).
 */
export function usePerfilPaciente(id: string | undefined): PerfilPaciente {
  const db = useSQLiteContext();
  const idValido = typeof id === 'string' && ehUuid(id);
  const [paciente, setPaciente] = useState<Patient | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoDoHistorico[]>([]);
  const [carregando, setCarregando] = useState(idValido);

  useFocusEffect(
    useCallback(() => {
      if (!idValido) return undefined;
      let ativo = true;
      Promise.all([buscarPaciente(db, id), listarAvaliacoesDoPaciente(db, id)]).then(
        ([encontrado, lista]) => {
          if (!ativo) return;
          setPaciente(encontrado);
          setAvaliacoes([...lista].reverse());
          setCarregando(false);
        },
      );
      return () => {
        ativo = false;
      };
    }, [db, id, idValido]),
  );

  return {
    paciente,
    avaliacoes,
    carregando,
    naoEncontrado: !idValido || (!carregando && paciente === null),
  };
}
