import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { buscarAvaliador, salvarAvaliador } from '@/database/avaliador';
import type { Avaliador } from '@/types/avaliador';

/** Nome e registro do avaliador do aparelho, usados no cabeçalho de todos os laudos (HU010). */
export function useAvaliador() {
  const db = useSQLiteContext();
  const [avaliador, setAvaliador] = useState<Avaliador>({ nome: '', registro: '' });
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let ativo = true;
    buscarAvaliador(db).then((lido) => {
      if (!ativo) return;
      setAvaliador(lido);
      setCarregado(true);
    });
    return () => {
      ativo = false;
    };
  }, [db]);

  const atualizar = useCallback(
    async (campos: Partial<Avaliador>) => {
      const gravado = await salvarAvaliador(db, { ...avaliador, ...campos });
      setAvaliador(gravado);
    },
    [db, avaliador],
  );

  return { avaliador, carregado, atualizar };
}
