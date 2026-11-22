import { Text } from 'react-native';

import { TopoParallax } from '@/components/TopoParallax';
import type { ParallaxSalto } from '@/hooks/useParallaxSalto';
import type { AlturaDoTopo } from '@/utils/resumoAvaliacao';
import { CASAS_ALTURA, formatarDecimal } from '@/utils/formatacao';

const ALTURA_TOPO = 200;

const ROTULO: Record<AlturaDoTopo['motivo'], string> = {
  unica: 'Altura',
  lesionada: 'Altura · perna lesionada',
  mais_fraca: 'Altura · perna mais fraca',
};

/** Topo ilustrado do resultado (D16): o personagem salta e o topo mostra a altura medida. */
export function TopoResultado({ parallax, topo }: { parallax: ParallaxSalto; topo: AlturaDoTopo }) {
  return (
    <TopoParallax parallax={parallax} altura={ALTURA_TOPO}>
      <Text className="text-xs font-semibold uppercase text-destaque">{ROTULO[topo.motivo]}</Text>
      <Text className="font-titulo text-4xl text-texto">
        {formatarDecimal(topo.alturaCm, CASAS_ALTURA)} cm
      </Text>
    </TopoParallax>
  );
}
