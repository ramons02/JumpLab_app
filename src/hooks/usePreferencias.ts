import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import {
  CHAVE_SUGESTAO_AUTOMATICA,
  gravarPreferencia,
  lerPreferencia,
} from '@/database/preferencias';

/** Preferências do aparelho: por ora, a chave "Sugestão automática (em teste)" (spec 018, RN15). */
export function usePreferencias() {
  const db = useSQLiteContext();
  const [sugestaoLigada, setSugestaoLigada] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    lerPreferencia(db, CHAVE_SUGESTAO_AUTOMATICA).then((valor) => {
      if (!ativo) return;
      setSugestaoLigada(valor === '1');
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [db]);

  const definirSugestaoLigada = useCallback(
    async (ligada: boolean) => {
      setSugestaoLigada(ligada);
      await gravarPreferencia(db, CHAVE_SUGESTAO_AUTOMATICA, ligada ? '1' : '0');
    },
    [db],
  );

  return { sugestaoLigada, carregando, definirSugestaoLigada };
}
