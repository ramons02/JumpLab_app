/**
 * Cálculos biomecânicos a partir dos quadros marcados no vídeo.
 * Esta spec (006) cria só o tempo entre quadros; a spec 007 completa o arquivo.
 */

/** Tempo em segundos entre dois quadros: (final - inicial) / fps. */
export function tempoS(quadroInicial: number, quadroFinal: number, fps: number): number {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError('O FPS precisa ser um número maior que zero.');
  }
  if (quadroFinal < quadroInicial) {
    throw new RangeError('O quadro final não pode ser anterior ao inicial.');
  }
  return (quadroFinal - quadroInicial) / fps;
}
