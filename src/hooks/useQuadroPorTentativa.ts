import { useCallback, useState } from 'react';

/**
 * Quadro mostrado no analisador, guardado por tentativa (chave `perna-numero`, spec 007): voltar a
 * uma tentativa traz o quadro onde ela estava. Volta a 0 quando o vídeo daquela tentativa muda.
 */
export function useQuadroPorTentativa(chave: string, uri: string | null) {
  const [quadros, setQuadros] = useState<Record<string, { uri: string | null; quadro: number }>>(
    {},
  );
  const guardado = quadros[chave];
  const quadro = guardado && guardado.uri === uri ? guardado.quadro : 0;
  const setQuadro = useCallback(
    (novo: number) => setQuadros((atuais) => ({ ...atuais, [chave]: { uri, quadro: novo } })),
    [chave, uri],
  );
  return [quadro, setQuadro] as const;
}
