import { useRef, useState } from 'react';
import { Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { limitarQuadro, quadroDaBarra } from '@/utils/quadros';

/** Marca sobre a barra (D23): evento marcado (letra) ou sugestão automática (losango). */
export interface MarcaDaBarra {
  quadro: number;
  rotulo: string;
  tipo: 'evento' | 'sugestao';
}

/** Trecho entre a decolagem e a aterrissagem, pintado na barra (D23). */
export interface TrechoDeVoo {
  de: number;
  ate: number;
}

const CLASSE_MARCA: Record<MarcaDaBarra['tipo'], string> = {
  evento: 'bg-destaque text-fundo',
  sugestao: 'bg-aviso text-fundo',
};

interface BarraDeQuadrosProps {
  quadro: number;
  totalQuadros: number;
  desabilitada: boolean;
  marcas?: MarcaDaBarra[];
  voo?: TrechoDeVoo | null;
  onArrastar(quadro: number): void; // durante o movimento
  onSoltar(quadro: number): void; // posição final, quadro inteiro
}

/** Barra de progresso por quadro: toque e arrasto levam ao quadro da posição do dedo. */
export function BarraDeQuadros({
  quadro,
  totalQuadros,
  desabilitada,
  marcas = [],
  voo = null,
  onArrastar,
  onSoltar,
}: BarraDeQuadrosProps) {
  const [largura, setLargura] = useState(0);
  const ultimo = useRef(quadro);
  const ultimoQuadro = Math.max(totalQuadros - 1, 0);
  const fracao = ultimoQuadro > 0 ? limitarQuadro(quadro, totalQuadros) / ultimoQuadro : 0;
  const posicao = (q: number) =>
    ultimoQuadro > 0 ? `${(limitarQuadro(q, totalQuadros) / ultimoQuadro) * 100}%` : '0%';

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
    <>
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
        className={`h-12 justify-end pb-3 ${desabilitada ? 'opacity-40' : ''}`}
        {...toque}
      >
        <View pointerEvents="none" className="h-1.5 rounded-full bg-borda">
          <View
            testID="barra-quadros-preenchida"
            className="h-1.5 rounded-full bg-destaque/60"
            style={{ width: `${fracao * 100}%` }}
          />
          {voo ? (
            <View
              testID="barra-voo"
              className="absolute -top-1 h-3.5 rounded bg-destaque"
              style={{
                left: posicao(voo.de),
                width: `${(Math.max(voo.ate - voo.de, 0) / Math.max(ultimoQuadro, 1)) * 100}%`,
              }}
            />
          ) : null}
        </View>
        {marcas.map((marca) => (
          <Text
            key={`${marca.tipo}-${marca.rotulo}-${marca.quadro}`}
            testID={`marca-barra-${marca.tipo}`}
            pointerEvents="none"
            className={`absolute top-0 -ml-2 h-4 w-4 overflow-hidden rounded text-center text-[10px] font-extrabold ${CLASSE_MARCA[marca.tipo]}`}
            style={{ left: posicao(marca.quadro) }}
          >
            {marca.rotulo}
          </Text>
        ))}
        <View
          pointerEvents="none"
          className="absolute -ml-2.5 h-5 w-5 rounded-full border-2 border-fundo bg-texto"
          style={{ left: `${fracao * 100}%`, top: 23 }}
        />
      </View>
      {voo ? (
        <Text testID="texto-voo" className="text-center text-xs font-semibold text-destaque">
          {`voo · ${voo.ate - voo.de} quadros`}
        </Text>
      ) : null}
    </>
  );
}
