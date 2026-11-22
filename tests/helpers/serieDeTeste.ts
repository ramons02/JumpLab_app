import type { MarcasRepeticao, SquatSeries } from '@/types/squat';

/** Repetição com início, fundo e fim (quadro e altura da barra). */
export function repeticao(
  inicio: [number, number],
  fundo: [number, number],
  fim: [number, number],
): MarcasRepeticao {
  return {
    inicio: { quadro: inicio[0], y: inicio[1] },
    fundo: { quadro: fundo[0], y: fundo[1] },
    fim: { quadro: fim[0], y: fim[1] },
  };
}

/** Calibração do CA01: topo 100 e base 158,5 dão 1,3 px/cm. */
export const CALIBRACAO_CA01 = { topoY: 100, baseY: 158.5 };

/** CA01: fundo no quadro 100 (y 300), fim no 137 (y 224), a 60 fps. */
export const SERIE_CA01: SquatSeries = {
  fps: 60,
  calibracao: CALIBRACAO_CA01,
  repeticoes: [repeticao([46, 224], [100, 300], [137, 224])],
};

/**
 * CA02: subidas de 30 quadros (0,5 s a 60 fps) com amplitudes de 45, 50 e 40 cm (58,5, 65 e 52 px),
 * dando 0,90, 1,00 e 0,80 m/s.
 */
export const SERIE_CA02: SquatSeries = {
  fps: 60,
  calibracao: CALIBRACAO_CA01,
  repeticoes: [
    repeticao([0, 200], [54, 258.5], [84, 200]),
    repeticao([126, 200], [180, 265], [210, 200]),
    repeticao([252, 200], [306, 252], [336, 200]),
  ],
};
