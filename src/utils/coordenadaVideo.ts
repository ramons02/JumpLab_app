/** Largura e altura, em pontos da tela ou em pixels do vídeo. */
export interface Dimensoes {
  largura: number;
  altura: number;
}

/** Escala e faixa preta de cima do vídeo exibido com contentFit="contain" na área. */
function encaixe(area: Dimensoes, video: Dimensoes | null) {
  const origem = video && video.largura > 0 && video.altura > 0 ? video : area;
  const escala = Math.min(area.largura / origem.largura, area.altura / origem.altura);
  const alturaExibida = origem.altura * escala;
  return { escala, margemTopo: (area.altura - alturaExibida) / 2, alturaExibida };
}

/**
 * Altura do toque em pixels da imagem original do vídeo. Toque na faixa preta (fora da imagem)
 * devolve null. Sem o tamanho do vídeo, usa a própria área como sistema de coordenadas.
 */
export function toqueParaYVideo(
  toqueY: number,
  area: Dimensoes,
  video: Dimensoes | null,
): number | null {
  const { escala, margemTopo, alturaExibida } = encaixe(area, video);
  const dentro = toqueY - margemTopo;
  if (dentro < 0 || dentro > alturaExibida) return null;
  return dentro / escala;
}

/** Posição na tela de uma altura em pixels do vídeo (inverso de toqueParaYVideo). */
export function yVideoParaTela(yVideo: number, area: Dimensoes, video: Dimensoes | null): number {
  const { escala, margemTopo } = encaixe(area, video);
  return margemTopo + yVideo * escala;
}
