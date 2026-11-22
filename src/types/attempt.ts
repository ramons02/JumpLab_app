export type PernaTentativa = 'unica' | 'direita' | 'esquerda';
export type NumeroTentativa = 1 | 2 | 3;
export type EventoSalto = 'toque' | 'decolagem' | 'aterrissagem';
/** Número inteiro do quadro de cada evento marcado (spec 007). */
export type MarcasSalto = Partial<Record<EventoSalto, number>>;

/** Vídeo escolhido para uma tentativa. Só existe durante a avaliação; nunca é gravado (D14). */
export interface VideoSelecionado {
  uri: string; // file:// local, só durante a avaliação
  nome: string; // nome do arquivo, exibido na tela
  duracaoS: number;
  fpsLido: number | null; // inteiro; null se não lido
  fpsDoArquivo: number | null; // taxa da faixa de vídeo, usada na navegação (spec 006)
  temporario: boolean; // cópia criada para a análise; apagada ao fim (D14)
}

/** Sugestão automática dos quadros de uma tentativa (spec 018); pertence ao vídeo (`uri`). */
export type SugestaoQuadros =
  | { estado: 'analisando'; uri: string }
  | { estado: 'pronta'; uri: string; quadros: MarcasSalto }
  | { estado: 'falhou'; uri: string; motivo: string };

export interface TentativaEmAndamento {
  video: VideoSelecionado | null;
  fpsSelecionado: number | null;
  fpsConfirmado: number | null;
  marcas: MarcasSalto;
  /** null: sugestão não pedida (spec 018). Nunca vira marcação. */
  sugestao: SugestaoQuadros | null;
}

export type TentativasPorPerna = Partial<Record<PernaTentativa, TentativaEmAndamento[]>>;

/** Tentativa concluída: espelho da tabela `tentativa` (gravada pela spec 008). */
export interface Attempt {
  perna: PernaTentativa;
  numero: NumeroTentativa;
  /** FPS confirmado */
  fps: number;
  /** Só no Drop Jump */
  quadroToque: number | null;
  quadroDecolagem: number;
  quadroAterrissagem: number;
  /** Quadros sugeridos pela sugestão automática (spec 018); vazio sem sugestão. Fora das medidas. */
  quadrosSugeridos: MarcasSalto;
}
