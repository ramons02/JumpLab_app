import type { Attempt } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import type { ResultadoSalto } from '@/types/resultadoSalto';

/** O que vai para resultado_json: o ResultadoSalto da spec 007 mais versao e tipo, sem recálculo. */
export interface ResumoSalto extends ResultadoSalto {
  versao: 1;
  tipo: 'salto';
}

/** A HU014 acrescenta a variante do agachamento a esta união. */
export type ResumoAvaliacao = ResumoSalto;

export interface NovaAvaliacao {
  pacienteId: string;
  protocolo: Protocol;
  /** AAAA-MM-DDTHH:MM local */
  dataHora: string;
  pernaLesionada: PernaLesionada;
  cargaKg: number | null;
  tentativas: Attempt[];
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
  protocolo: Protocol;
  dataHora: string;
  pernaLesionada: PernaLesionada;
  resumo: ResumoAvaliacao;
}
