export type GrupoMuscular =
  'quadriceps' | 'gluteo_maximo' | 'gluteo_medio' | 'posteriores' | 'triceps_sural';

export type LadoGrupo = 'direita' | 'esquerda' | 'ambas';
export type LadoPerna = 'direita' | 'esquerda';

export interface GrupoNoPonto {
  grupo: GrupoMuscular;
  lado: LadoGrupo;
}

/** Um ponto de "O que melhorar": sugerido pelas medidas ou acrescentado pelo avaliador. */
export interface PontoMelhoria {
  titulo: string;
  /** Pode ser vazio (ponto livre sem grupo conhecido). */
  grupos: GrupoNoPonto[];
  /** Curto, com valor e referência; "citado pelo avaliador" no ponto livre. */
  motivo: string;
  /** Pode ser vazio. */
  foco: string;
  origem: 'sugerido' | 'avaliador';
}

/** Grupos citados nos pontos, com as pernas em que aparecem (sem repetir). */
export type GruposConsolidados = Partial<Record<GrupoMuscular, LadoPerna[]>>;

export type EstadoMapa = 'melhorar' | 'ok' | 'neutro';
