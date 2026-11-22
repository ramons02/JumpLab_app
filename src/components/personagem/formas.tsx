import { Line } from 'react-native-svg';

import type { PontoDesenho } from '@/types/personagem';

export function Segmento({
  de,
  ate,
  cor,
  largura,
}: {
  de: PontoDesenho;
  ate: PontoDesenho;
  cor: string;
  largura: number;
}) {
  return (
    <Line
      x1={de.x}
      y1={de.y}
      x2={ate.x}
      y2={ate.y}
      stroke={cor}
      strokeWidth={largura}
      strokeLinecap="round"
    />
  );
}

export function pontoEntre(a: PontoDesenho, b: PontoDesenho, fracao: number): PontoDesenho {
  return { x: a.x + (b.x - a.x) * fracao, y: a.y + (b.y - a.y) * fracao };
}
