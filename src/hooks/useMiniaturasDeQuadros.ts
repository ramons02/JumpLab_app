import { extrairQuadros } from 'leitura-video';
import { useEffect, useRef, useState } from 'react';

import { posicaoNoArquivoS } from '@/utils/quadros';

/** Largura das miniaturas, em pixels: a fita mostra 7 lado a lado. */
const LARGURA_MINIATURA_PX = 96;
/** Espera o dedo parar (arrasto da barra, toques seguidos) antes de gerar as imagens. */
const ESPERA_MS = 120;

/**
 * Miniaturas da fita de quadros (D23): gera no aparelho as imagens dos quadros pedidos que ainda não
 * foram geradas e guarda por quadro enquanto o vídeo for o mesmo. Sem leitura, a fita mostra só o
 * número do quadro.
 */
export function useMiniaturasDeQuadros(
  uri: string,
  fps: number | null,
  quadros: number[],
): Record<number, string> {
  const [miniaturas, setMiniaturas] = useState<{ uri: string; imagens: Record<number, string> }>({
    uri,
    imagens: {},
  });
  // Quadros já pedidos para este vídeo (prontos ou a caminho): cada um é gerado uma vez só.
  const pedidos = useRef(new Set<number>());
  const chave = quadros.join(',');
  const doVideo = miniaturas.uri === uri ? miniaturas.imagens : {};

  useEffect(() => {
    pedidos.current = new Set();
  }, [uri]);

  useEffect(() => {
    if (fps === null) return undefined;
    const faltam = chave
      .split(',')
      .filter(Boolean)
      .map(Number)
      .filter((q) => !pedidos.current.has(q));
    if (faltam.length === 0) return undefined;
    let ativo = true;
    const espera = setTimeout(() => {
      faltam.forEach((q) => pedidos.current.add(q));
      extrairQuadros(
        uri,
        faltam.map((q) => posicaoNoArquivoS(q, fps)),
        LARGURA_MINIATURA_PX,
      )
        .then((enderecos) => {
          if (!ativo) return;
          setMiniaturas((atual) => {
            const imagens = atual.uri === uri ? { ...atual.imagens } : {};
            faltam.forEach((q, i) => {
              const endereco = enderecos[i];
              if (endereco) imagens[q] = endereco;
            });
            return { uri, imagens };
          });
        })
        .catch(() => {
          faltam.forEach((q) => pedidos.current.delete(q));
        });
    }, ESPERA_MS);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [uri, fps, chave]);

  return doVideo;
}
