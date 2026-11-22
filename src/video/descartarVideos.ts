import { File } from 'expo-file-system';

import type { TentativasPorPerna } from '@/types/attempt';
import { videosTemporarios } from '@/utils/tentativas';

/** Apaga as cópias temporárias dos vídeos da avaliação (D14); arquivo que já não existe é ignorado. */
export async function descartarVideos(tentativas: TentativasPorPerna): Promise<void> {
  for (const uri of videosTemporarios(tentativas)) {
    try {
      const arquivo = new File(uri);
      if (arquivo.exists) arquivo.delete();
    } catch {
      // O arquivo pode ter sido removido pelo sistema; não há mais nada a apagar.
    }
  }
}
