import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import { salvarAvaliacao } from '@/database/avaliacoes';
import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import type { Assessment, NovaAvaliacao } from '@/types/assessment';
import { montarResumoSalto } from '@/utils/resumoAvaliacao';
import { tentativasConcluidas } from '@/utils/tentativas';
import { descartarVideos } from '@/video/descartarVideos';

/** A avaliação em andamento no formato gravado; null sem rascunho. */
export function avaliacaoDoRascunho(
  rascunho: ReturnType<typeof useRascunhoAvaliacao>['rascunho'],
): NovaAvaliacao | null {
  if (!rascunho) return null;
  return {
    pacienteId: rascunho.pacienteId,
    protocolo: rascunho.protocolo,
    dataHora: rascunho.dataHora,
    pernaLesionada: rascunho.pernaLesionada,
    cargaKg: rascunho.cargaKg,
    tentativas: tentativasConcluidas(rascunho.tentativas, rascunho.protocolo),
  };
}

/**
 * Grava a avaliação em andamento. Depois de gravar, apaga os vídeos (D14) e o rascunho; uma falha ao
 * apagar o vídeo não desfaz a gravação.
 */
export function useSalvarAvaliacao() {
  const db = useSQLiteContext();
  const { rascunho, descartarRascunho } = useRascunhoAvaliacao();
  const [salvando, setSalvando] = useState(false);
  const emAndamento = useRef(false);

  const salvar = useCallback(
    async (observacoes: string): Promise<Assessment | null> => {
      const nova = avaliacaoDoRascunho(rascunho);
      if (!nova || !rascunho || emAndamento.current) return null;
      emAndamento.current = true;
      setSalvando(true);
      try {
        const salva = await salvarAvaliacao(db, nova, montarResumoSalto(nova), observacoes);
        await descartarVideos(rascunho.tentativas).catch(() => undefined);
        descartarRascunho();
        return salva;
      } finally {
        emAndamento.current = false;
        setSalvando(false);
      }
    },
    [db, rascunho, descartarRascunho],
  );

  return { salvando, salvar };
}
