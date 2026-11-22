import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

function Selo({ texto }: { texto: string }) {
  return (
    <View className="rounded-full bg-fundo/80 px-3 py-1">
      <Text className="text-xs text-texto">{texto}</Text>
    </View>
  );
}

/**
 * Vídeo demonstrativo do protocolo: em repetição contínua, sem som e sem controles. A câmera lenta
 * (0,5x) já está gravada no arquivo. O useVideoPlayer libera o tocador quando a tela sai.
 */
export function VideoDemonstrativo({ fonte }: { fonte: number }) {
  const [repetindo, setRepetindo] = useState(false);
  const player = useVideoPlayer(fonte, (tocador) => {
    tocador.loop = true;
    tocador.muted = true;
    tocador.play();
  });

  useEffect(() => {
    const inscricao = player.addListener('playToEnd', () => setRepetindo(true));
    return () => inscricao.remove();
  }, [player]);

  return (
    <View className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-borda bg-cartao">
      <VideoView
        testID="video-demonstrativo"
        player={player}
        nativeControls={false}
        contentFit="contain"
        style={{ flex: 1 }}
      />
      <View pointerEvents="none" className="absolute left-3 right-3 top-3 flex-row justify-between">
        <Selo texto="vídeo demonstrativo · 0,5x" />
        {repetindo && <Selo texto="repetindo" />}
      </View>
    </View>
  );
}
