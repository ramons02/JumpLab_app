import type { Assessment, AvaliacaoDoHistorico, ResumoAvaliacao } from '@/types/assessment';
import type { Avaliador } from '@/types/avaliador';
import type { PontoMelhoria } from '@/types/melhoria';
import type { Patient, PernaLesionada, Perfil } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import { calcularIdade } from '@/utils/datas';
import {
  montarGraficoLsi,
  montarGraficoProtocolo,
  temPontosSuficientes,
  type GraficoEvolucao,
} from '@/utils/evolucao';
import { sugerirMelhorias } from '@/utils/melhorias';
import { PROTOCOLOS } from '@/utils/protocolos';

const TAMANHO_DATA = 'AAAA-MM-DD'.length;

export interface DadosLaudo {
  avaliador: Avaliador;
  paciente: { nome: string; idadeNaAvaliacao: number; perfil: Perfil };
  avaliacao: {
    protocolo: Protocol;
    dataHora: string;
    /** A gravada na avaliação */
    pernaLesionada: PernaLesionada;
    /** FPS distintos das tentativas */
    fps: number[];
    observacoes: string;
    resumo: ResumoAvaliacao;
    /** Só no agachamento */
    cargaKg: number | null;
    /** Os gravados ou, nas avaliações antigas, as sugestões calculadas na hora (spec 017) */
    melhorias: PontoMelhoria[];
  };
  evolucao: {
    /** null com menos de duas avaliações do protocolo até a data (RN10) */
    protocolo: GraficoEvolucao | null;
    /** Só nos unilaterais; null com menos de duas avaliações */
    lsi: GraficoEvolucao | null;
  };
}

function suficiente(grafico: GraficoEvolucao | null): GraficoEvolucao | null {
  return grafico && temPontosSuficientes(grafico) ? grafico : null;
}

/**
 * Junta o que vai no laudo, só com números já guardados no resumo. A evolução usa apenas avaliações do
 * mesmo paciente até a data e hora desta (RN06, RN07).
 */
export function montarDadosLaudo(
  avaliacao: Assessment,
  paciente: Patient,
  historico: AvaliacaoDoHistorico[],
  avaliador: Avaliador,
): DadosLaudo {
  const { resumo, protocolo } = avaliacao;
  const ate = historico.filter(
    (a) => a.pacienteId === avaliacao.pacienteId && a.dataHora <= avaliacao.dataHora,
  );
  const fps =
    resumo.tipo === 'agach'
      ? [resumo.fps]
      : [...new Set(Object.values(resumo.pernas).flatMap((p) => p?.fps ?? []))].sort(
          (a, b) => a - b,
        );
  return {
    avaliador,
    paciente: {
      nome: paciente.nome,
      idadeNaAvaliacao: calcularIdade(
        paciente.dataNascimento,
        avaliacao.dataHora.slice(0, TAMANHO_DATA),
      ),
      perfil: paciente.perfil,
    },
    avaliacao: {
      protocolo,
      dataHora: avaliacao.dataHora,
      pernaLesionada: avaliacao.pernaLesionada,
      fps,
      observacoes: avaliacao.observacoes,
      resumo,
      cargaKg: avaliacao.cargaKg,
      melhorias: avaliacao.melhorias ?? sugerirMelhorias(resumo, avaliacao.pernaLesionada),
    },
    evolucao: {
      protocolo: suficiente(montarGraficoProtocolo(protocolo, ate, paciente.pernaLesionada)),
      lsi: PROTOCOLOS[protocolo].unilateral ? suficiente(montarGraficoLsi(ate)) : null,
    },
  };
}
