import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { buscarAvaliacao } from '@/database/avaliacoes';
import type { Assessment } from '@/types/assessment';
import { ehUuid } from '@/utils/ids';

/** Carrega uma avaliação salva para leitura. Id inválido ou inexistente: avaliacao null. */
export function useAvaliacaoSalva(id: string | undefined) {
  const db = useSQLiteContext();
  const idValido = typeof id === 'string' && ehUuid(id);
  const [estado, setEstado] = useState<{ carregando: boolean; avaliacao: Assessment | null }>({
    carregando: idValido,
    avaliacao: null,
  });

  useEffect(() => {
    if (!idValido) return undefined;
    let ativo = true;
    buscarAvaliacao(db, id).then((avaliacao) => {
      if (ativo) setEstado({ carregando: false, avaliacao });
    });
    return () => {
      ativo = false;
    };
  }, [db, id, idValido]);

  return estado;
}
