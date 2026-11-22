import type { EventoSalto } from '@/types/attempt';

/** Ponto na imagem, de 0 a 1 (x da esquerda, y do topo), com a confiança da detecção. */
export interface PontoImagem {
  x: number;
  y: number;
  visibilidade: number;
}

/** Pontos de um quadro devolvidos pelo módulo nativo de detecção (spec 018). */
export interface PontosDoQuadro {
  /** Número inteiro do quadro no arquivo. */
  quadro: number;
  /** Tornozelo, calcanhar e ponta do pé de cada lado (lado anatômico); null sem pessoa. */
  pes: { esquerdo: PontoImagem[]; direito: PontoImagem[] } | null;
  /** Só para a escala da margem (plano, tabela de complexidade). */
  quadris: { esquerdo: PontoImagem; direito: PontoImagem } | null;
}

/** Por quadro: o ponto mais baixo dos pés e o comprimento da perna na imagem. */
export interface AlturaDosPes {
  quadro: number;
  yPe: number | null;
  perna: number | null;
}

export type ResultadoSugestao =
  | { tipo: 'pronta'; quadros: Partial<Record<EventoSalto, number>> }
  | { tipo: 'falhou'; motivo: string };

export interface ResumoGrupoTeste {
  nome: 'CMJ' | 'Squat Jump' | 'Drop Jump';
  total: number;
  dentro: number;
}

export interface ResumoTesteSugestao {
  grupos: ResumoGrupoTeste[];
  total: number;
  dentro: number;
  meta: number;
}
