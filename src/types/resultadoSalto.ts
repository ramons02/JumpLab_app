import type { PernaTentativa } from '@/types/attempt';

// Nomes alinhados ao resumo gravado pela spec 008 (ResumoSalto = ResultadoSalto + versao + tipo).

export interface MedidasSalto {
  alturaCm: number;
  tempoVooMs: number;
  /** Só no Drop Jump */
  tempoContatoMs: number | null;
  /** Só no Drop Jump */
  rsi: number | null;
  /** Margem da altura para ±1 quadro (D3) */
  margemCm: number;
}

export interface MedidaTentativa extends MedidasSalto {
  fps: number;
  baixaPrecisao: boolean;
}

/** Médias das três tentativas de uma perna. */
export interface ResumoPerna extends MedidasSalto {
  /** Alguma tentativa com baixa precisão */
  baixaPrecisao: boolean;
  /** FPS distintos das tentativas */
  fps: number[];
  /** Na ordem 1, 2, 3 */
  tentativas: MedidasSalto[];
}

export interface ResumoLsi {
  /** Porcentagem; null se a perna de referência medir zero */
  valor: number | null;
  base: 'altura' | 'rsi';
  modo: 'lesionada' | 'mais_fraca';
  /** Só no modo 'mais_fraca' */
  pernaMaisFraca: 'direita' | 'esquerda' | null;
}

export interface ResultadoSalto {
  pernas: Partial<Record<PernaTentativa, ResumoPerna>>;
  /** Só nos unilaterais */
  lsi: ResumoLsi | null;
  baixaPrecisao: boolean;
}

export type CorLsi = 'verde' | 'amarelo' | 'vermelho' | 'neutro';
