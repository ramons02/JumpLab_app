import { useEffect, useRef, useState } from 'react';
import { G, Svg } from 'react-native-svg';

import { Anilhas, Barra, Cabeca, Chao } from '@/components/personagem/CabecaEAcessorios';
import { Braco, Perna, Short, Tronco } from '@/components/personagem/CorpoPersonagem';
import type { EstadoPersonagem } from '@/types/personagem';
import { ESTADO_PARADO, poseDesenho } from '@/utils/poseDesenho';

export type EstadoOuCiclo = EstadoPersonagem | ((segundos: number) => EstadoPersonagem);

interface PersonagemDesenhoProps {
  /** Estado fixo (vindo da rolagem) ou ciclo por tempo (demonstração da HU014). */
  estado: EstadoOuCiclo;
  /** Só anima enquanto a tela está em foco. */
  ativo?: boolean;
  largura: number;
  altura: number;
}

function ehParado(estado: EstadoPersonagem): boolean {
  return (
    estado.agachamento === ESTADO_PARADO.agachamento &&
    estado.subidaPx === ESTADO_PARADO.subidaPx &&
    estado.bracos === ESTADO_PARADO.bracos &&
    estado.barra === ESTADO_PARADO.barra
  );
}

/**
 * Segundos desde a montagem, atualizados a cada quadro só quando há movimento por tempo (ciclo ou
 * respiração do personagem parado) e a tela está ativa.
 */
function useRelogio(animar: boolean): number {
  const [segundos, setSegundos] = useState(0);
  const inicio = useRef(Date.now());

  useEffect(() => {
    if (!animar) return;
    let quadro = requestAnimationFrame(function passo() {
      setSegundos((Date.now() - inicio.current) / 1000);
      quadro = requestAnimationFrame(passo);
    });
    return () => cancelAnimationFrame(quadro);
  }, [animar]);

  return segundos;
}

/** Personagem de frente do topo ilustrado (D16). Só ilustração; o leitor de tela não o anuncia. */
export function PersonagemDesenho({
  estado,
  ativo = true,
  largura,
  altura,
}: PersonagemDesenhoProps) {
  const ciclo = typeof estado === 'function';
  const animar = ativo && (ciclo || ehParado(estado));
  const segundos = useRelogio(animar);
  const atual = ciclo ? estado(segundos) : estado;
  const pose = poseDesenho(atual, segundos);
  const bracosAtras = atual.bracos < 0;
  const bracos = (
    <>
      <Braco braco={pose.bracoEsquerdo} />
      <Braco braco={pose.bracoDireito} />
    </>
  );

  return (
    <Svg
      testID="personagem-desenho"
      width={largura}
      height={altura}
      viewBox="-110 -330 220 342"
      preserveAspectRatio="xMidYMax meet"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Chao deslocamentoY={pose.deslocamentoY} />
      <G transform={`translate(0 ${pose.deslocamentoY})`}>
        {atual.barra && <Anilhas yOmbro={pose.yOmbro} />}
        <Perna
          perna={pose.pernaEsquerda}
          quadril={pose.quadril.esquerdo}
          lado={-1}
          noAr={pose.noAr}
        />
        <Perna perna={pose.pernaDireita} quadril={pose.quadril.direito} lado={1} noAr={pose.noAr} />
        <Short yQuadril={pose.quadril.direito.y} agachamento={atual.agachamento} />
        {bracosAtras && bracos}
        <Tronco yOmbro={pose.yOmbro} yQuadril={pose.quadril.direito.y} />
        <Cabeca centro={pose.cabeca} yOmbro={pose.yOmbro} />
        {!bracosAtras && bracos}
        {atual.barra && <Barra yOmbro={pose.yOmbro} />}
      </G>
    </Svg>
  );
}
