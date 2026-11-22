import { Text } from 'react-native';

import { TopoParallax } from '@/components/TopoParallax';
import type { ParallaxSalto } from '@/hooks/useParallaxSalto';
import type { ResumoAvaliacao } from '@/types/assessment';
import type { PernaLesionada } from '@/types/patient';
import type { EstadoPersonagem } from '@/types/personagem';
import { CASAS_ALTURA, CASAS_VELOCIDADE, formatarDecimal } from '@/utils/formatacao';
import { cicloAgachamento } from '@/utils/poseDesenho';
import { alturaDoTopo, type AlturaDoTopo } from '@/utils/resumoAvaliacao';

const ALTURA_TOPO = 200;

const ROTULO: Record<AlturaDoTopo['motivo'], string> = {
  unica: 'Altura',
  lesionada: 'Altura · perna lesionada',
  mais_fraca: 'Altura · perna mais fraca',
};

export interface ConteudoTopo {
  rotulo: string;
  valor: string;
  /** Altura medida para o salto do desenho; null no agachamento. */
  alturaCm: number | null;
  ciclo?: (segundos: number) => EstadoPersonagem;
}

/** O que o topo mostra: a altura do salto (D16) ou a melhor velocidade do agachamento (FR-020). */
export function conteudoDoTopo(
  resumo: ResumoAvaliacao,
  pernaLesionada: PernaLesionada,
): ConteudoTopo {
  if (resumo.tipo === 'agach') {
    return {
      rotulo: 'Melhor velocidade',
      valor: `${formatarDecimal(resumo.melhorVelocidadeMs, CASAS_VELOCIDADE)} m/s`,
      alturaCm: null,
      ciclo: cicloAgachamento,
    };
  }
  const topo = alturaDoTopo(resumo, pernaLesionada);
  return {
    rotulo: ROTULO[topo.motivo],
    valor: `${formatarDecimal(topo.alturaCm, CASAS_ALTURA)} cm`,
    alturaCm: topo.alturaCm,
  };
}

/** Topo ilustrado do resultado: o personagem salta (ou agacha com a barra) e o topo mostra a medida. */
export function TopoResultado({ parallax, topo }: { parallax: ParallaxSalto; topo: ConteudoTopo }) {
  return (
    <TopoParallax parallax={parallax} altura={ALTURA_TOPO} ciclo={topo.ciclo}>
      <Text className="text-xs font-semibold uppercase text-destaque">{topo.rotulo}</Text>
      <Text className="font-titulo text-4xl text-texto">{topo.valor}</Text>
    </TopoParallax>
  );
}
