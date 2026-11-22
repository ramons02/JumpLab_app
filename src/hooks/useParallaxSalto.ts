import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { EstadoPersonagem } from '@/types/personagem';
import {
  ESMAECIMENTO_MAXIMO,
  ESTADO_PARADO,
  estadoDoSalto,
  FATOR_PARALLAX,
  progressoDaRolagem,
} from '@/utils/poseDesenho';

export interface ParallaxSalto {
  estado: EstadoPersonagem;
  aoRolar: (evento: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** FATOR_PARALLAX x rolagem */
  deslocamentoTopo: Animated.Value;
  /** 1 - ESMAECIMENTO_MAXIMO x progresso */
  opacidadeTopo: Animated.Value;
}

/**
 * Liga a rolagem da lista ao salto do personagem do topo (D16). Com "Remover animações" ligado no
 * aparelho, o personagem fica de pé e o topo parado (FR-018).
 */
export function useParallaxSalto(subidaPx: number): ParallaxSalto {
  const [estado, setEstado] = useState<EstadoPersonagem>(ESTADO_PARADO);
  // useState com inicializador: o mesmo Animated.Value durante toda a vida da tela.
  const [deslocamentoTopo] = useState(() => new Animated.Value(0));
  const [opacidadeTopo] = useState(() => new Animated.Value(1));
  const semAnimacao = useRef(false);
  const ultimoProgresso = useRef(0);

  useEffect(() => {
    let ativo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((ligado) => {
      if (ativo) semAnimacao.current = ligado;
    });
    const assinatura = AccessibilityInfo.addEventListener('reduceMotionChanged', (ligado) => {
      semAnimacao.current = ligado;
    });
    return () => {
      ativo = false;
      assinatura.remove();
    };
  }, []);

  const aoRolar = useCallback(
    (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (semAnimacao.current) return;
      const { contentOffset, contentSize, layoutMeasurement } = evento.nativeEvent;
      const rolagem = Math.max(contentOffset.y, 0);
      const progresso = progressoDaRolagem(rolagem, contentSize.height - layoutMeasurement.height);
      deslocamentoTopo.setValue(rolagem * FATOR_PARALLAX);
      opacidadeTopo.setValue(1 - ESMAECIMENTO_MAXIMO * progresso);
      // Depois do salto completo, rolar mais não muda o desenho: evita renderizar à toa.
      if (progresso === ultimoProgresso.current) return;
      ultimoProgresso.current = progresso;
      setEstado(estadoDoSalto(progresso, subidaPx));
    },
    [deslocamentoTopo, opacidadeTopo, subidaPx],
  );

  return { estado, aoRolar, deslocamentoTopo, opacidadeTopo };
}
