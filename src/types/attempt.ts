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

export interface TentativaEmAndamento {
  video: VideoSelecionado | null;
  fpsSelecionado: number | null;
  fpsConfirmado: number | null;
  marcas: MarcasSalto;
}

export type TentativasPorPerna = Partial<Record<PernaTentativa, TentativaEmAndamento[]>>;
