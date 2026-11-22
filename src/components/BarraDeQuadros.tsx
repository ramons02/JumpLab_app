import { useRef, useState } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { limitarQuadro, quadroDaBarra } from '@/utils/quadros';

interface BarraDeQuadrosProps {
  quadro: number;
  totalQuadros: number;
  desabilitada: boolean;
  onArrastar(quadro: number): void; // durante o movimento
  onSoltar(quadro: number): void; // posição final, quadro inteiro
}

/** Barra de progresso por quadro: toque e arrasto levam ao quadro da posição do dedo. */
export function BarraDeQuadros({
  quadro,
  totalQuadros,
  desabilitada,
  onArrastar,
  onSoltar,
}: BarraDeQuadrosProps) {
  const [largura, setLargura] = useState(0);
  const ultimo = useRef(quadro);
  const ultimoQuadro = Math.max(totalQuadros - 1, 0);
  const fracao = ultimoQuadro > 0 ? limitarQuadro(quadro, totalQuadros) / ultimoQuadro : 0;

  function quadroDoToque(evento: GestureResponderEvent): number {
    return quadroDaBarra(evento.nativeEvent.locationX, largura, totalQuadros);
  }

  function arrastar(evento: GestureResponderEvent) {
    ultimo.current = quadroDoToque(evento);
    onArrastar(ultimo.current);
  }

  function soltar() {
    onSoltar(limitarQuadro(ultimo.current, totalQuadros));
  }

  function passo(delta: number) {
    onSoltar(limitarQuadro(quadro + delta, totalQuadros));
  }

  const toque = desabilitada
    ? {}
    : {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: arrastar,
        onResponderMove: arrastar,
        onResponderRelease: soltar,
        onResponderTerminate: soltar,
      };

  return (
    <View
      testID="barra-quadros"
      accessibilityRole="adjustable"
      accessibilityLabel="Posição no vídeo"
      accessibilityState={{ disabled: desabilitada }}
      accessibilityValue={{ min: 0, max: ultimoQuadro, now: quadro }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(evento) => {
        if (desabilitada) return;
        passo(evento.nativeEvent.actionName === 'increment' ? 1 : -1);
      }}
      onLayout={(evento: LayoutChangeEvent) => setLargura(evento.nativeEvent.layout.width)}
      className={`h-10 justify-center ${desabilitada ? 'opacity-40' : ''}`}
      {...toque}
    >
      <View pointerEvents="none" className="h-1.5 rounded-full bg-borda">
        <View
          testID="barra-quadros-preenchida"
          className="h-1.5 rounded-full bg-destaque"
          style={{ width: `${fracao * 100}%` }}
        />
      </View>
    </View>
  );
}
