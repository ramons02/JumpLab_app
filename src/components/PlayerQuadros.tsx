import { VideoView } from 'expo-video';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BarraDeQuadros } from '@/components/BarraDeQuadros';
import { useTocadorQuadros } from '@/hooks/useTocadorQuadros';
import type { VideoSelecionado } from '@/types/attempt';
import { fpsDeNavegacao, podeAvancar, podeVoltar } from '@/utils/quadros';

interface PlayerQuadrosProps {
  video: VideoSelecionado;
  fpsConfirmado: number | null;
  quadro: number;
  onMudarQuadro(quadro: number): void;
}

function BotaoQuadro({
  rotulo,
  habilitado,
  onPress,
}: {
  rotulo: string;
  habilitado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      disabled={!habilitado}
      onPress={onPress}
      className={`flex-1 items-center rounded-2xl bg-destaque py-5 ${habilitado ? '' : 'opacity-40'}`}
    >
      <Text className="text-lg font-semibold text-fundo">{rotulo}</Text>
    </Pressable>
  );
}

/** Vídeo quadro a quadro: imagem parada, número do quadro, barra e botões de -1 e +1 quadro. */
export function PlayerQuadros({ video, fpsConfirmado, quadro, onMudarQuadro }: PlayerQuadrosProps) {
  const fps = fpsDeNavegacao(video, fpsConfirmado);
  const tocador = useTocadorQuadros({ video, fps, quadro, onMudarQuadro });
  const [previa, setPrevia] = useState<number | null>(null);
  const navegavel = fps !== null;
  const exibido = previa ?? quadro;

  return (
    <View className="gap-3">
      <View className="h-80 w-full overflow-hidden rounded-2xl border border-borda bg-fundo">
        <VideoView
          testID="video-quadros"
          player={tocador.player}
          nativeControls={false}
          contentFit="contain"
          style={{ flex: 1 }}
        />
        <View
          testID="linha-guia"
          pointerEvents="none"
          className="absolute bottom-0 left-1/2 top-0 w-px bg-destaque opacity-60"
        />
      </View>

      <Text className="text-center text-base text-texto">
        {navegavel
          ? `Quadro ${exibido} / ${tocador.totalQuadros - 1}`
          : 'Confirme o FPS do vídeo para navegar pelos quadros.'}
      </Text>

      <BarraDeQuadros
        quadro={exibido}
        totalQuadros={tocador.totalQuadros}
        desabilitada={!navegavel}
        onArrastar={(alvo) => {
          setPrevia(alvo);
          tocador.posicionar(alvo);
        }}
        onSoltar={(alvo) => {
          setPrevia(null);
          tocador.irPara(alvo);
        }}
      />

      <View className="flex-row gap-3">
        <BotaoQuadro
          rotulo="-1 Frame"
          habilitado={navegavel && podeVoltar(quadro)}
          onPress={tocador.voltar}
        />
        <BotaoQuadro
          rotulo="+1 Frame"
          habilitado={navegavel && podeAvancar(quadro, tocador.totalQuadros)}
          onPress={tocador.avancar}
        />
      </View>
    </View>
  );
}
