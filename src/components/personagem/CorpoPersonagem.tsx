import { Circle, Ellipse, G, Path, Rect, Text } from 'react-native-svg';

import { pontoEntre, Segmento } from '@/components/personagem/formas';
import cores from '@/theme/cores';
import type { BracoDesenho, PernaDesenho, PontoDesenho } from '@/types/personagem';

const C = cores.personagem;

function Tenis({ pe, lado, apontado }: { pe: PontoDesenho; lado: number; apontado: boolean }) {
  return (
    <G transform={`translate(${pe.x} ${pe.y})`}>
      <Ellipse cx={lado * 3} cy={apontado ? 4 : 2} rx={12} ry={apontado ? 10 : 8} fill={C.tenis} />
      <Rect x={lado * 3 - 12} y={apontado ? 10 : 7} width={24} height={4} rx={2} fill={C.sola} />
    </G>
  );
}

interface PernaProps {
  perna: PernaDesenho;
  quadril: PontoDesenho;
  lado: number;
  noAr: boolean;
}

export function Perna({ perna, quadril, lado, noAr }: PernaProps) {
  return (
    <G>
      <Segmento de={quadril} ate={perna.joelho} cor={C.pele} largura={19} />
      <Segmento de={perna.joelho} ate={perna.pe} cor={C.pele} largura={16} />
      <Segmento
        de={pontoEntre(perna.joelho, perna.pe, 0.7)}
        ate={perna.pe}
        cor={C.meia}
        largura={16}
      />
      <Tenis pe={perna.pe} lado={lado} apontado={noAr || perna.levantada} />
    </G>
  );
}

export function Braco({ braco }: { braco: BracoDesenho }) {
  return (
    <G>
      <Segmento de={braco.ombro} ate={braco.cotovelo} cor={C.pele} largura={12} />
      <Segmento de={braco.cotovelo} ate={braco.mao} cor={C.pele} largura={11} />
      <Circle cx={braco.mao.x} cy={braco.mao.y} r={6.5} fill={C.pele} />
      <Segmento
        de={braco.ombro}
        ate={pontoEntre(braco.ombro, braco.cotovelo, 0.4)}
        cor={C.camiseta}
        largura={16}
      />
    </G>
  );
}

/** Short, que abre conforme o agachamento. */
export function Short({ yQuadril, agachamento }: { yQuadril: number; agachamento: number }) {
  const y = yQuadril;
  const abre = 8 * agachamento;
  const caminho = `M -27 ${y - 10} L 27 ${y - 10} L ${29 + abre} ${y + 24} L 3 ${y + 24} L 0 ${y + 10} L -3 ${y + 24} L ${-29 - abre} ${y + 24} Z`;
  return <Path d={caminho} fill={C.short} strokeLinejoin="round" />;
}

export function Tronco({ yOmbro, yQuadril }: { yOmbro: number; yQuadril: number }) {
  return (
    <G>
      <Rect
        x={-28}
        y={yOmbro - 2}
        width={56}
        height={yQuadril - yOmbro}
        rx={16}
        fill={C.camiseta}
      />
      <Path
        d={`M -10 ${yOmbro - 1} Q 0 ${yOmbro + 9} 10 ${yOmbro - 1}`}
        stroke={C.camisetaFundo}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <Text
        x={0}
        y={(yOmbro + yQuadril) / 2 + 7}
        textAnchor="middle"
        fontSize={20}
        fontWeight="800"
        fill={C.camisetaLetra}
      >
        J
      </Text>
    </G>
  );
}
