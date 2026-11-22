import type { Attempt } from '@/types/attempt';
import type { PontoMelhoria } from '@/types/melhoria';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import type { ResultadoSalto } from '@/types/resultadoSalto';
import type { ResumoAgachamento, SquatSeries } from '@/types/squat';

/** O que vai para resultado_json: o ResultadoSalto da spec 007 mais versao e tipo, sem recálculo. */
export interface ResumoSalto extends ResultadoSalto {
  versao: 1;
  tipo: 'salto';
}

export type ResumoAvaliacao = ResumoSalto | ResumoAgachamento;

export interface NovaAvaliacao {
  pacienteId: string;
  protocolo: Protocol;
  /** AAAA-MM-DDTHH:MM local */
  dataHora: string;
  pernaLesionada: PernaLesionada;
  cargaKg: number | null;
  tentativas: Attempt[];
  /** Só no agachamento (HU014). */
  serie: SquatSeries | null;
  /** "O que melhorar" revisado pelo avaliador (HU017); null nas avaliações antigas. */
  melhorias: PontoMelhoria[] | null;
}

export interface Assessment extends NovaAvaliacao {
  id: string;
  observacoes: string;
  resumo: ResumoAvaliacao;
  criadoEm: string;
  atualizadoEm: string;
  pendenteSync: boolean;
}

/** Avaliação no histórico do paciente (HU003, HU009, HU010), sem as tentativas. */
export interface AvaliacaoDoHistorico {
  id: string;
  /** Repetido para o laudo conferir que nada de outro paciente entra (HU010 RN06). */
  pacienteId: string;
  protocolo: Protocol;
  dataHora: string;
  pernaLesionada: PernaLesionada;
  resumo: ResumoAvaliacao;
  melhorias: PontoMelhoria[] | null;
}
