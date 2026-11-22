import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { NumeroTentativa, PernaTentativa } from '@/types/attempt';

/** Abre a câmera do app para gravar o vídeo desta perna e tentativa (spec 011). */
export function useAbrirCamera(perna: PernaTentativa, numero: NumeroTentativa) {
  const router = useRouter();
  return useCallback(
    () =>
      router.push({ pathname: '/assessment/camera', params: { perna, tentativa: String(numero) } }),
    [router, perna, numero],
  );
}
