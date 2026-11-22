import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { Segmento } from '@/components/personagem/formas';
import cores from '@/theme/cores';
import type { PontoDesenho } from '@/types/personagem';
import { RAIO_CABECA } from '@/utils/poseDesenho';

const C = cores.personagem;

export function Cabeca({ centro, yOmbro }: { centro: PontoDesenho; yOmbro: number }) {
  const { x, y } = centro;
  const R = RAIO_CABECA;
  const cabelo = `M ${x - R} ${y - 2} Q ${x - R} ${y - R - 6} ${x} ${y - R - 3} Q ${x + R} ${y - R - 6} ${x + R} ${y - 2} Q ${x + 10} ${y - 13} ${x} ${y - 12} Q ${x - 10} ${y - 13} ${x - R} ${y - 2} Z`;
  return (
    <G>
      <Segmento
        de={{ x: 0, y: yOmbro + 2 }}
        ate={{ x: 0, y: y + R - 4 }}
        cor={C.pele}
        largura={14}
      />
      <Circle cx={x - R} cy={y + 3} r={5} fill={C.peleFundo} />
      <Circle cx={x + R} cy={y + 3} r={5} fill={C.peleFundo} />
      <Circle cx={x} cy={y} r={R} fill={C.pele} />
      <Path d={cabelo} fill={C.cabelo} />
      <Rect x={x - R + 1} y={y - 11} width={2 * R - 2} height={5} rx={2.5} fill={C.camiseta} />
      <Circle cx={x - 7} cy={y + 1} r={2.8} fill={C.olho} />
      <Circle cx={x + 7} cy={y + 1} r={2.8} fill={C.olho} />
      <Path
        d={`M ${x - 6} ${y + 9} Q ${x} ${y + 14} ${x + 6} ${y + 9}`}
        stroke={C.boca}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
    </G>
  );
}

/** Anilhas atrás do corpo, no agachamento com barra (HU014). */
export function Anilhas({ yOmbro }: { yOmbro: number }) {
  return (
    <G>
      <Rect
        x={-92}
        y={yOmbro - 30}
        width={12}
        height={58}
        rx={3}
        fill={C.anilhaFundo}
        stroke={C.anilhaBorda}
        strokeWidth={1.2}
      />
      <Rect
        x={80}
        y={yOmbro - 30}
        width={12}
        height={58}
        rx={3}
        fill={C.anilhaFundo}
        stroke={C.anilhaBorda}
        strokeWidth={1.2}
      />
    </G>
  );
}

/** Barra na frente do corpo, no agachamento com barra (HU014). */
export function Barra({ yOmbro }: { yOmbro: number }) {
  return (
    <Line
      x1={-86}
      y1={yOmbro - 1}
      x2={86}
      y2={yOmbro - 1}
      stroke={C.barra}
      strokeWidth={4}
      strokeLinecap="round"
    />
  );
}

/** Contorno no chão e sombra, que encolhe conforme o desenho sobe. */
export function Chao({ deslocamentoY }: { deslocamentoY: number }) {
  const escala = Math.max(0.55, 1 + deslocamentoY / 160);
  return (
    <G>
      <Ellipse
        cx={0}
        cy={0}
        rx={62}
        ry={10}
        fill="none"
        stroke={C.sola}
        strokeWidth={1.5}
        opacity={0.8}
      />
      <Ellipse cx={0} cy={0} rx={36 * escala} ry={6 * escala} fill={C.sombra} />
    </G>
  );
}
