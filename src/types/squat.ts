/** Ponto marcado na barra: quadro inteiro e altura em pixels da imagem original do vídeo. */
export interface MarcaBarra {
  quadro: number;
  y: number;
}

export type EventoRepeticao = 'inicio' | 'fundo' | 'fim';

export type MarcasRepeticao = Record<EventoRepeticao, MarcaBarra | null>;

export interface CalibracaoDisco {
  topoY: number;
  baseY: number;
}

/** Série gravada: só as repetições completas. */
export interface SquatSeries {
  fps: number;
  calibracao: CalibracaoDisco;
  repeticoes: MarcasRepeticao[];
}

export interface ResultadoRepeticao {
  numero: number;
  descidaS: number;
  subidaS: number;
  amplitudeCm: number;
  velocidadeMs: number;
  potenciaW: number;
}

/** Saída de medirAgachamento. */
export interface ResultadoAgachamento {
  cargaKg: number;
  fps: number;
  repeticoes: ResultadoRepeticao[];
  melhorVelocidadeMs: number;
  melhorPotenciaW: number;
  perdaVelocidadePct: number | null;
}

/** O que vai para resultado_json no agachamento. */
export interface ResumoAgachamento extends ResultadoAgachamento {
  versao: 1;
  tipo: 'agach';
}

export type CorPerda = 'verde' | 'amarelo' | 'vermelho' | 'neutro';

/** Calibração e marcas em andamento no rascunho, presas ao vídeo da tentativa. */
export interface SerieEmAndamento {
  uriDoVideo: string | null;
  calibracao: { topoY: number; baseY: number | null } | null;
  /** Começa com uma repetição vazia. */
  repeticoes: MarcasRepeticao[];
}
