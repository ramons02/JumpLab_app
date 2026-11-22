import { Pressable, Text, View } from 'react-native';

import type { VideoSelecionado } from '@/types/attempt';

interface VideoDaTentativaProps {
  video: VideoSelecionado;
  fpsConfirmado: number | null;
  aoTrocarFps: () => void;
  aoTrocarVideo: () => void;
}

function Link({ rotulo, aoTocar }: { rotulo: string; aoTocar: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={aoTocar} hitSlop={8}>
      <Text className="text-xs font-semibold text-destaque">{rotulo}</Text>
    </Pressable>
  );
}

/** Linha do vídeo escolhido, com o FPS confirmado e as trocas de FPS e de vídeo. */
export function VideoDaTentativa({
  video,
  fpsConfirmado,
  aoTrocarFps,
  aoTrocarVideo,
}: VideoDaTentativaProps) {
  const descricao =
    fpsConfirmado === null ? video.nome : `${video.nome} · ${fpsConfirmado} fps confirmado`;
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-borda bg-cartao p-3">
      <Text numberOfLines={1} className="flex-1 text-xs text-texto">
        {descricao}
      </Text>
      {fpsConfirmado !== null ? <Link rotulo="Trocar FPS" aoTocar={aoTrocarFps} /> : null}
      <Link rotulo="Trocar vídeo" aoTocar={aoTrocarVideo} />
    </View>
  );
}
