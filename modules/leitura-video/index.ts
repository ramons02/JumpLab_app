import { requireNativeModule } from 'expo';

/*
 * Dados do arquivo de vídeo que dão a taxa de gravação (decisão D22). Só Android; o que não puder ser
 * lido vem null.
 */
export interface DadosDoVideo {
  /** Taxa em que a câmera capturou (vídeos de câmera lenta gravam isso no arquivo). */
  taxaDeCaptura: number | null;
  /** Quadros da faixa de vídeo. */
  quadros: number | null;
  /** Duração da faixa de vídeo, em segundos. */
  duracaoS: number | null;
  /** Taxa declarada na faixa de vídeo. */
  taxaDaFaixa: number | null;
}

const modulo = requireNativeModule<{
  lerDadosDoVideo(uri: string): Promise<DadosDoVideo>;
  extrairQuadros(uri: string, temposS: number[], largura: number): Promise<(string | null)[]>;
}>('LeituraVideo');

export function lerDadosDoVideo(uri: string): Promise<DadosDoVideo> {
  return modulo.lerDadosDoVideo(uri);
}

/**
 * Miniaturas da fita de quadros do analisador (D23): uma imagem por tempo pedido, no quadro mais
 * próximo, com a largura dada em pixels. Volta o endereço de cada imagem no cache, ou null.
 */
export function extrairQuadros(
  uri: string,
  temposS: number[],
  largura: number,
): Promise<(string | null)[]> {
  return modulo.extrairQuadros(uri, temposS, largura);
}
