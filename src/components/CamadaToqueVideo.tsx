import { Pressable, Text, View } from 'react-native';

import { toqueParaYVideo, yVideoParaTela, type Dimensoes } from '@/utils/coordenadaVideo';

export interface MarcadorImagem {
  chave: string;
  yVideo: number;
  rotulo: string;
  tipo: 'disco' | 'barra';
}

interface CamadaToqueVideoProps {
  area: Dimensoes;
  video: Dimensoes | null;
  /** Texto do que o toque vai marcar; null quando nada está armado. */
  aviso: string | null;
  aoTocar: (yVideo: number) => void;
  marcadores: MarcadorImagem[];
}

/** Toque sobre a imagem (convertido para pixels do vídeo) e as linhas já marcadas. */
export function CamadaToqueVideo({
  area,
  video,
  aviso,
  aoTocar,
  marcadores,
}: CamadaToqueVideoProps) {
  return (
    <Pressable
      testID="camada-toque-video"
      accessibilityLabel="Imagem do vídeo"
      disabled={aviso === null}
      onPress={(evento) => {
        const y = toqueParaYVideo(evento.nativeEvent.locationY, area, video);
        if (y !== null) aoTocar(y);
      }}
      style={{ position: 'absolute', top: 0, left: 0, width: area.largura, height: area.altura }}
    >
      {marcadores.map((m) => (
        <View
          key={m.chave}
          pointerEvents="none"
          testID={`marcador-${m.chave}`}
          className={`absolute left-0 right-0 h-0.5 ${m.tipo === 'disco' ? 'bg-aviso' : 'bg-destaque'}`}
          style={{ top: yVideoParaTela(m.yVideo, area, video) }}
        >
          <Text className="absolute -top-4 right-2 text-[10px] text-texto">{m.rotulo}</Text>
        </View>
      ))}
      {aviso ? (
        <View
          pointerEvents="none"
          className="absolute bottom-2 self-center rounded-full bg-fundo/80 px-3 py-1"
        >
          <Text className="text-xs font-semibold text-aviso">{aviso}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
