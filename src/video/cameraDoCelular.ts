import { Linking } from 'react-native';

/** Abre o app de câmera do aparelho no modo vídeo (MediaStore.INTENT_ACTION_VIDEO_CAMERA). */
const ACAO_CAMERA_DE_VIDEO = 'android.media.action.VIDEO_CAMERA';

/**
 * Para aparelhos que não liberam a câmera lenta a outros apps (D21): abre a câmera do celular, onde o
 * avaliador troca para o modo Câmera lenta e filma; o vídeo volta pela galeria. Falso se não abriu.
 */
export async function abrirCameraDoCelular(): Promise<boolean> {
  try {
    await Linking.sendIntent(ACAO_CAMERA_DE_VIDEO);
    return true;
  } catch {
    return false;
  }
}
