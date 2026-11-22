import { VideoView } from 'expo-video';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BarraDeQuadros } from '@/components/BarraDeQuadros';
import { useAreaDoVideo } from '@/hooks/useAreaDoVideo';
import { useTocadorQuadros } from '@/hooks/useTocadorQuadros';
import type { VideoSelecionado } from '@/types/attempt';
import { tempoS } from '@/utils/biomechanics';
import type { Dimensoes } from '@/utils/coordenadaVideo';
import { formatarDecimal } from '@/utils/formatacao';
import { fpsDeNavegacao, podeAvancar, podeVoltar } from '@/utils/quadros';

const CASAS_TEMPO_S = 3;

interface PlayerQuadrosProps {
  video: VideoSelecionado;
  fpsConfirmado: number | null;
  quadro: number;
  onMudarQuadro(quadro: number): void;
  /** Camada sobre a imagem e abaixo da linha guia (toques e marcadores do agachamento, spec 014). */
  camadaSobreImagem?: (area: Dimensoes, video: Dimensoes | null) => ReactNode;
}

function BotaoQuadro({
  rotulo,
  habilitado,
  onPress,
  estreito = false,
}: {
  rotulo: string;
  habilitado: boolean;
  onPress: () => void;
  estreito?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      disabled={!habilitado}
      onPress={onPress}
      className={`${estreito ? 'px-4' : 'flex-1'} items-center rounded-2xl ${
        estreito ? 'border border-destaque' : 'bg-destaque'
      } py-5 ${habilitado ? '' : 'opacity-40'}`}
    >
      <Text className={`text-lg font-semibold ${estreito ? 'text-destaque' : 'text-fundo'}`}>
        {rotulo}
      </Text>
    </Pressable>
  );
}

/** Vídeo quadro a quadro: imagem parada, número do quadro, barra e botões de -1 e +1 quadro. */
export function PlayerQuadros({
  video,
  fpsConfirmado,
  quadro,
  onMudarQuadro,
  camadaSobreImagem,
}: PlayerQuadrosProps) {
  const fps = fpsDeNavegacao(video, fpsConfirmado);
  const tocador = useTocadorQuadros({ video, fps, quadro, onMudarQuadro });
  const [previa, setPrevia] = useState<number | null>(null);
  const imagem = useAreaDoVideo(tocador.player);
  const navegavel = fps !== null;
  const exibido = previa ?? quadro;

  return (
    <View className="gap-3">
      <View
        testID="imagem-video"
        className="h-80 w-full overflow-hidden rounded-2xl border border-borda bg-fundo"
        onLayout={imagem.aoMedir}
      >
        <VideoView
          testID="video-quadros"
          player={tocador.player}
          nativeControls={false}
          contentFit="contain"
          style={{ flex: 1 }}
        />
        {camadaSobreImagem && imagem.area ? camadaSobreImagem(imagem.area, imagem.video) : null}
        <View
          testID="linha-guia"
          accessibilityLabel="linha guia"
          pointerEvents="none"
          className="absolute bottom-0 left-1/2 top-0 w-0.5 bg-guia opacity-90"
        />
        <View
          pointerEvents="none"
          className="absolute left-2 top-2 rounded bg-fundo/70 px-1.5 py-0.5"
        >
          <Text className="text-[10px] text-texto">linha guia</Text>
        </View>
      </View>

      <View className="flex-row items-baseline justify-center gap-3">
        <Text className="text-base text-texto">
          {navegavel
            ? `Quadro ${exibido} / ${tocador.totalQuadros - 1}`
            : 'Confirme o FPS do vídeo para navegar pelos quadros.'}
        </Text>
        {navegavel && fpsConfirmado !== null && fpsConfirmado > 0 ? (
          <Text testID="tempo-quadro" className="text-sm text-textoSecundario">
            {formatarDecimal(tempoS(0, exibido, fpsConfirmado), CASAS_TEMPO_S)} s
          </Text>
        ) : null}
      </View>

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
          rotulo={tocador.reproduzindo ? 'Pausar' : 'Reproduzir'}
          habilitado={
            navegavel && (tocador.reproduzindo || podeAvancar(quadro, tocador.totalQuadros))
          }
          onPress={tocador.alternarReproducao}
          estreito
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
