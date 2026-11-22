import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import { buscarAvaliacao, listarAvaliacoesDoPaciente } from '@/database/avaliacoes';
import { buscarAvaliador } from '@/database/avaliador';
import { buscarPaciente } from '@/database/pacientes';
import { montarDadosLaudo, montarHtmlLaudo } from '@/utils/pdfGenerator';

/** A4 em pontos (research R1). */
const LARGURA_A4 = 595;
const ALTURA_A4 = 842;
const TIPO_PDF = 'application/pdf';

export type ResultadoLaudo = 'compartilhado' | 'erro';

/**
 * Gera o laudo da avaliação salva, no aparelho, e abre a folha de compartilhamento (HU010). Um toque
 * repetido enquanto gera é ignorado; falha em qualquer passo devolve 'erro' sem lançar.
 */
export function useLaudoPdf() {
  const db = useSQLiteContext();
  const [gerando, setGerando] = useState(false);
  const emAndamento = useRef(false);

  const gerarECompartilhar = useCallback(
    async (avaliacaoId: string): Promise<ResultadoLaudo | null> => {
      if (emAndamento.current) return null;
      emAndamento.current = true;
      setGerando(true);
      try {
        const avaliacao = await buscarAvaliacao(db, avaliacaoId);
        const paciente = avaliacao ? await buscarPaciente(db, avaliacao.pacienteId) : null;
        if (!avaliacao || !paciente) return 'erro';
        const historico = await listarAvaliacoesDoPaciente(db, paciente.id);
        const avaliador = await buscarAvaliador(db);
        const html = montarHtmlLaudo(montarDadosLaudo(avaliacao, paciente, historico, avaliador));
        const { uri } = await Print.printToFileAsync({
          html,
          width: LARGURA_A4,
          height: ALTURA_A4,
        });
        if (!(await Sharing.isAvailableAsync())) return 'erro';
        await Sharing.shareAsync(uri, { mimeType: TIPO_PDF, dialogTitle: 'Compartilhar laudo' });
        return 'compartilhado';
      } catch {
        return 'erro';
      } finally {
        emAndamento.current = false;
        setGerando(false);
      }
    },
    [db],
  );

  return { gerando, gerarECompartilhar };
}
