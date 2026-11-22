import type { VideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import type { Dimensoes } from '@/utils/coordenadaVideo';

function tamanhoDaFaixa(player: VideoPlayer): Dimensoes | null {
  const tamanho = player.videoTrack?.size;
  return tamanho ? { largura: tamanho.width, altura: tamanho.height } : null;
}

/** Área da imagem na tela (onLayout) e tamanho original do vídeo (faixa de vídeo do player). */
export function useAreaDoVideo(player: VideoPlayer) {
  const [area, setArea] = useState<Dimensoes | null>(null);
  const [video, setVideo] = useState<Dimensoes | null>(() => tamanhoDaFaixa(player));

  useEffect(() => {
    const inscricao = player.addListener('videoTrackChange', ({ videoTrack }) => {
      setVideo(
        videoTrack ? { largura: videoTrack.size.width, altura: videoTrack.size.height } : null,
      );
    });
    return () => inscricao.remove();
  }, [player]);

  function aoMedir(evento: LayoutChangeEvent) {
    const { width, height } = evento.nativeEvent.layout;
    setArea({ largura: width, altura: height });
  }

  return { area, video, aoMedir };
}
