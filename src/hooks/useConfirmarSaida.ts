import { usePreventRemove } from 'expo-router';
import { Alert } from 'react-native';

import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import type { TentativasPorPerna } from '@/types/attempt';
import { descartarVideos } from '@/video/descartarVideos';

/** Sair do analisador com vídeo escolhido pede confirmação e apaga os vídeos e o rascunho (D14). */
export function useConfirmarSaida(tentativas: TentativasPorPerna) {
  const { descartarRascunho } = useRascunhoAvaliacao();
  const temVideo = Object.values(tentativas).some((lista) => lista?.some((t) => t.video));

  usePreventRemove(temVideo, ({ repeat }) => {
    Alert.alert('Sair da avaliação?', 'As marcações feitas serão perdidas.', [
      { text: 'Continuar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await descartarVideos(tentativas);
          repeat();
          descartarRascunho();
        },
      },
    ]);
  });
}
