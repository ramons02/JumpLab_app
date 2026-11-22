import type { GrupoMuscular, LadoPerna } from '@/types/melhoria';
import type { LocalMapa } from '@/utils/melhorias';

/**
 * Desenho do mapa muscular (spec 017), igual na tela e no laudo: traçados do protótipo validado, de uma
 * perna com x crescendo para fora do corpo; a outra é espelhada. Viewbox 320 x 282, frente em x 80 e
 * costas em x 240.
 */
export const LARGURA_MAPA = 320;
export const ALTURA_MAPA = 282;
export const CENTRO_FRENTE = 80;
export const CENTRO_COSTAS = 240;
export const TOPO_MAPA = 16;

export const CONTORNO_PERNA =
  'M1 30 C1 70 6 105 9 128 C7 150 8 175 13 214 L12 232 C14 240 30 242 30 236 L24 214 C30 182 34 160 31 142 C30 134 31 128 33 122 C40 90 43 50 40 22 Z';
export const CONTORNO_QUADRIL = 'M0 -6 L34 -6 C40 8 43 18 41 28 L0 30 Z';

export interface Musculo {
  grupo: GrupoMuscular;
  d: string;
  fibras: string[];
}

export const MUSCULOS_FRENTE: Musculo[] = [
  {
    grupo: 'quadriceps',
    d: 'M6 36 C4 70 8 100 14 118 C20 123 28 119 32 110 C37 80 38 50 34 30 C24 24 12 26 6 36 Z',
    fibras: [
      'M20 31 C18 66 20 96 22 120',
      'M9 90 C8 104 11 114 16 118',
      'M33 60 C30 80 29 98 30 112',
    ],
  },
];

export const MUSCULOS_COSTAS: Musculo[] = [
  { grupo: 'gluteo_medio', d: 'M14 -3 C24 -8 38 -4 40 8 C34 3 22 1 14 -3 Z', fibras: [] },
  {
    grupo: 'gluteo_maximo',
    d: 'M2 6 C14 -1 34 3 39 18 C41 32 34 46 20 47 C8 47 2 40 2 30 Z',
    fibras: ['M6 14 C16 22 26 32 34 40', 'M4 26 C12 32 20 40 26 46'],
  },
  {
    grupo: 'posteriores',
    d: 'M6 52 C4 80 8 105 12 120 C20 126 28 124 32 116 C37 90 38 66 36 50 C26 46 14 46 6 52 Z',
    fibras: ['M21 50 C19 80 20 104 22 124', 'M10 70 C10 90 13 106 16 118'],
  },
  {
    grupo: 'triceps_sural',
    d: 'M11 138 C8 160 12 180 17 194 C22 198 28 192 31 178 C34 160 32 145 28 136 C22 132 15 132 11 138 Z',
    fibras: ['M20 134 C19 156 20 178 20 196'],
  },
];

export const DETALHES_FRENTE = ['M22 142 C27 165 26 190 22 210 L18 210 C19 190 19 165 22 142 Z'];
export const DETALHES_COSTAS = ['M19 196 L23 196 L22 220 L20 220 Z'];

/** Posição do número de cada local, na mesma escala da perna. */
export const MARCADOR: Record<LocalMapa['id'], { x: number; y: number }> = {
  quadril: { x: 50, y: 4 },
  coxa: { x: 48, y: 86 },
  panturrilha: { x: 44, y: 176 },
};

/** Frente: a perna direita do paciente aparece à esquerda da figura; costas: à direita. */
export function ladoDoDesenho(sinal: number, frente: boolean): LadoPerna {
  if (frente) return sinal < 0 ? 'direita' : 'esquerda';
  return sinal < 0 ? 'esquerda' : 'direita';
}
