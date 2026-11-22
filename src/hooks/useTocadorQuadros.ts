import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { VideoSelecionado } from '@/types/attempt';
import {
  INTERVALO_ATUALIZACAO_S,
  limitarQuadro,
  podeAvancar,
  podeVoltar,
  posicaoNoArquivoS,
  quadroNaPosicao,
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
  reproduzindo: boolean;
  alternarReproducao(): void;
}

/** Pausa e leva o tocador a uma posição (fora do componente: o tocador é um objeto nativo). */
function pausarEm(tocador: VideoPlayer, posicaoS: number) {
  tocador.pause();
  tocador.currentTime = posicaoS;
}

function tocar(tocador: VideoPlayer) {
  tocador.play();
}

/**
 * Cuida do tocador: vídeo mudo, parado no meio do quadro pedido. Durante a reprodução, o quadro da
 * tela acompanha o tempo do vídeo; ao pausar, para num quadro inteiro. O quadro é controlado por quem
 * usa (quadro e onMudarQuadro).
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
    tocador.timeUpdateEventInterval = INTERVALO_ATUALIZACAO_S;
    tocador.pause();
  });
  const totalQuadros = fps === null ? 1 : totalDeQuadros(video.duracaoS, fps);
  const [reproduzindo, setReproduzindo] = useState(false);
  const reproduzindoAgora = useRef(false);

  // Guarda o último quadro pedido: toques rápidos antes de a tela redesenhar contam um a um.
  const atual = useRef(quadro);
  useEffect(() => {
    atual.current = quadro;
  }, [quadro]);

  const marcarReproducao = useCallback((valor: boolean) => {
    reproduzindoAgora.current = valor;
    setReproduzindo(valor);
  }, []);

  const posicionar = useCallback(
    (alvo: number) => {
      if (fps === null) return;
      marcarReproducao(false);
      pausarEm(player, posicaoNoArquivoS(limitarQuadro(alvo, totalQuadros), fps));
    },
    [player, fps, totalQuadros, marcarReproducao],
  );

  // Quadro mudado por fora (ou pelos botões): leva o tocador até ele, menos durante a reprodução.
  useEffect(() => {
    if (!reproduzindoAgora.current) posicionar(quadro);
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

  const alternarReproducao = useCallback(() => {
    if (fps === null) return;
    if (reproduzindoAgora.current) {
      irPara(quadroNaPosicao(player.currentTime, fps, totalQuadros));
      return;
    }
    if (!podeAvancar(atual.current, totalQuadros)) return;
    marcarReproducao(true);
    tocar(player);
  }, [fps, player, totalQuadros, irPara, marcarReproducao]);

  useEffect(() => {
    if (fps === null) return undefined;
    const tempo = player.addListener('timeUpdate', ({ currentTime }) => {
      if (!reproduzindoAgora.current) return;
      const novo = quadroNaPosicao(currentTime, fps, totalQuadros);
      if (novo === atual.current) return;
      atual.current = novo;
      onMudarQuadro(novo);
    });
    const fim = player.addListener('playToEnd', () => irPara(totalQuadros - 1));
    return () => {
      tempo.remove();
      fim.remove();
    };
  }, [player, fps, totalQuadros, irPara, onMudarQuadro]);

  return {
    player,
    totalQuadros,
    irPara,
    posicionar,
    avancar,
    voltar,
    reproduzindo,
    alternarReproducao,
  };
}
