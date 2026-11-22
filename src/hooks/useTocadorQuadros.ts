import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef } from 'react';

import type { VideoSelecionado } from '@/types/attempt';
import {
  limitarQuadro,
  podeAvancar,
  podeVoltar,
  posicaoNoArquivoS,
  totalDeQuadros,
} from '@/utils/quadros';

interface ArgsTocadorQuadros {
  video: VideoSelecionado;
  fps: number | null; // fpsDeNavegacao
  quadro: number;
  onMudarQuadro(quadro: number): void;
}

interface TocadorQuadros {
  player: VideoPlayer;
  totalQuadros: number;
  irPara(quadro: number): void;
  /** Mostra um quadro sem mudar o quadro da tela (prévia durante o arrasto da barra). */
  posicionar(quadro: number): void;
  avancar(): void;
  voltar(): void;
}

/** Pausa e leva o tocador a uma posição (fora do componente: o tocador é um objeto nativo). */
function pausarEm(tocador: VideoPlayer, posicaoS: number) {
  tocador.pause();
  tocador.currentTime = posicaoS;
}

/**
 * Cuida do tocador: vídeo pausado e mudo, sempre posicionado no meio do quadro pedido.
 * O quadro é controlado por quem usa (quadro e onMudarQuadro). A reprodução entra numa fase seguinte.
 */
export function useTocadorQuadros({
  video,
  fps,
  quadro,
  onMudarQuadro,
}: ArgsTocadorQuadros): TocadorQuadros {
  const player = useVideoPlayer(video.uri, (tocador) => {
    tocador.muted = true;
    tocador.loop = false;
    tocador.pause();
  });
  const totalQuadros = fps === null ? 1 : totalDeQuadros(video.duracaoS, fps);

  // Guarda o último quadro pedido: toques rápidos antes de a tela redesenhar contam um a um.
  const atual = useRef(quadro);
  useEffect(() => {
    atual.current = quadro;
  }, [quadro]);

  const posicionar = useCallback(
    (alvo: number) => {
      if (fps === null) return;
      pausarEm(player, posicaoNoArquivoS(limitarQuadro(alvo, totalQuadros), fps));
    },
    [player, fps, totalQuadros],
  );

  useEffect(() => {
    posicionar(quadro);
  }, [posicionar, quadro]);

  const irPara = useCallback(
    (alvo: number) => {
      if (fps === null) return;
      const limitado = limitarQuadro(alvo, totalQuadros);
      atual.current = limitado;
      posicionar(limitado);
      onMudarQuadro(limitado);
    },
    [fps, totalQuadros, posicionar, onMudarQuadro],
  );

  const avancar = useCallback(() => {
    if (podeAvancar(atual.current, totalQuadros)) irPara(atual.current + 1);
  }, [irPara, totalQuadros]);

  const voltar = useCallback(() => {
    if (podeVoltar(atual.current)) irPara(atual.current - 1);
  }, [irPara]);

  return { player, totalQuadros, irPara, posicionar, avancar, voltar };
}
