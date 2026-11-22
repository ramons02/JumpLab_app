import type { PernaTentativa, TentativasPorPerna } from '@/types/attempt';

/**
 * Ao trocar o vídeo de uma tentativa, o vídeo antigo só pode ser apagado se for temporário (gravação do
 * app ou cópia no cache) e nenhuma outra tentativa o usar (D14). Devolve a URI a apagar, ou null.
 */
export function videoParaApagarAoSubstituir(
  tentativas: TentativasPorPerna,
  perna: PernaTentativa,
  indice: number,
): string | null {
  const antigo = tentativas[perna]?.[indice]?.video;
  if (!antigo?.temporario) return null;
  const usadoEmOutra = Object.entries(tentativas).some(([outraPerna, lista]) =>
    lista?.some(
      (tentativa, i) =>
        (outraPerna !== perna || i !== indice) && tentativa.video?.uri === antigo.uri,
    ),
  );
  return usadoEmOutra ? null : antigo.uri;
}
