import type { VideoSelecionado } from '@/types/attempt';

/** Posição dentro do quadro ao pedir um quadro por tempo: o meio evita cair no quadro vizinho. */
export const MEIO_QUADRO = 0.5;
/** Evita perder o último quadro quando a duração vem arredondada para baixo. */
export const TOLERANCIA_QUADROS = 1e-6;
/** Intervalo do evento de tempo durante a reprodução. */
export const INTERVALO_ATUALIZACAO_S = 0.05;

function taxaValida(fps: number | null): fps is number {
  return typeof fps === 'number' && Number.isFinite(fps) && fps > 0;
}

/** Taxa usada para andar no arquivo: a da faixa de vídeo; sem ela, o FPS confirmado. */
export function fpsDeNavegacao(
  video: VideoSelecionado,
  fpsConfirmado: number | null,
): number | null {
  if (taxaValida(video.fpsDoArquivo)) return video.fpsDoArquivo;
  if (taxaValida(fpsConfirmado)) return fpsConfirmado;
  return null;
}

export function totalDeQuadros(duracaoS: number, fps: number): number {
  if (!taxaValida(fps) || !Number.isFinite(duracaoS)) return 1;
  return Math.max(1, Math.floor(duracaoS * fps + TOLERANCIA_QUADROS));
}

export function limitarQuadro(quadro: number, total: number): number {
  if (!Number.isFinite(quadro)) return 0;
  return Math.min(Math.max(Math.round(quadro), 0), Math.max(total - 1, 0));
}

export function posicaoNoArquivoS(quadro: number, fps: number): number {
  return (quadro + MEIO_QUADRO) / fps;
}

export function quadroNaPosicao(tempoS: number, fps: number, total: number): number {
  return limitarQuadro(Math.floor(tempoS * fps + TOLERANCIA_QUADROS), total);
}

export function quadroDaBarra(x: number, largura: number, total: number): number {
  if (largura <= 0) return 0;
  const fracao = Math.min(Math.max(x / largura, 0), 1);
  return limitarQuadro(Math.floor(fracao * total), total);
}

export function podeVoltar(quadro: number): boolean {
  return quadro > 0;
}

export function podeAvancar(quadro: number, total: number): boolean {
  return quadro < total - 1;
}
