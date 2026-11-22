import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { Animated, useWindowDimensions, View } from 'react-native';
import { Defs, RadialGradient, Rect, Stop, Svg } from 'react-native-svg';

import { PersonagemDesenho } from '@/components/PersonagemDesenho';
import type { ParallaxSalto } from '@/hooks/useParallaxSalto';
import cores from '@/theme/cores';
import type { EstadoPersonagem } from '@/types/personagem';

/** Fração da largura e da altura do topo ocupada pelo personagem (à direita). */
const LARGURA_PERSONAGEM = 0.62;
const ALTURA_PERSONAGEM = 0.96;

interface TopoParallaxProps {
  parallax: Pick<ParallaxSalto, 'estado' | 'deslocamentoTopo' | 'opacidadeTopo'>;
  altura: number;
  children: ReactNode;
  /** Movimento por tempo no lugar da rolagem (demonstração do agachamento, HU014). */
  ciclo?: (segundos: number) => EstadoPersonagem;
}

function Brilho() {
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
      <Defs>
        <RadialGradient id="brilho" cx="55%" cy="70%" rx="60%" ry="70%">
          <Stop offset="0" stopColor={cores.personagem.brilho} />
          <Stop offset="0.7" stopColor={cores.fundo} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#brilho)" />
    </Svg>
  );
}

/**
 * Topo ilustrado das telas com lista (D16): brilho verde, personagem que salta com a rolagem e o
 * conteúdo à esquerda. Desce mais devagar que a lista e esmaece, pelos valores do `useParallaxSalto`.
 */
export function TopoParallax({ parallax, altura, children, ciclo }: TopoParallaxProps) {
  const emFoco = useIsFocused();
  const { width } = useWindowDimensions();

  return (
    <View testID="topo-parallax" style={{ height: altura }} className="-mx-4 overflow-hidden">
      <Animated.View
        style={{
          flex: 1,
          opacity: parallax.opacidadeTopo,
          transform: [{ translateY: parallax.deslocamentoTopo }],
        }}
      >
        <Brilho />
        <View className="absolute bottom-0 right-2">
          <PersonagemDesenho
            estado={ciclo ?? parallax.estado}
            ativo={emFoco}
            largura={width * LARGURA_PERSONAGEM}
            altura={altura * ALTURA_PERSONAGEM}
          />
        </View>
        <View className="absolute inset-x-4 bottom-3">{children}</View>
      </Animated.View>
    </View>
  );
}
