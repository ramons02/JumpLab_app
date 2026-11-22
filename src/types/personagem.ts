/** Estado que move o desenho do topo. Unidades da ilustração, nunca medidas da avaliação. */
export interface EstadoPersonagem {
  /** 0 em pé a 1 agachado */
  agachamento: number;
  /** deslocamento vertical do desenho, em px da ilustração */
  subidaPx: number;
  /** -1 para trás, 0 ao lado do corpo, 1 para cima */
  bracos: number;
  /** agachamento com barra (HU014) */
  barra: boolean;
}

export interface PontoDesenho {
  x: number;
  y: number;
}

export interface PernaDesenho {
  pe: PontoDesenho;
  joelho: PontoDesenho;
  levantada: boolean;
}

export interface BracoDesenho {
  ombro: PontoDesenho;
  cotovelo: PontoDesenho;
  mao: PontoDesenho;
}

/** Articulações calculadas por poseDesenho, no sistema do viewBox do SVG (chão em y = 0). */
export interface PoseDesenho {
  pernaDireita: PernaDesenho;
  pernaEsquerda: PernaDesenho;
  quadril: { direito: PontoDesenho; esquerdo: PontoDesenho };
  yOmbro: number;
  cabeca: PontoDesenho;
  bracoDireito: BracoDesenho;
  bracoEsquerdo: BracoDesenho;
  noAr: boolean;
  /** negativo = para cima */
  deslocamentoY: number;
}
