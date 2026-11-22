import type {
  PernaTentativa,
  TentativaEmAndamento,
  TentativasPorPerna,
  VideoSelecionado,
} from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { podeConfirmarFps } from '@/utils/fps';
import { PROTOCOLOS } from '@/utils/protocolos';

/** Tentativas obrigatórias por perna (D11). */
export const TENTATIVAS_POR_PERNA = 3;

function tentativaVazia(): TentativaEmAndamento {
  return { video: null, fpsSelecionado: null, fpsConfirmado: null, marcas: {} };
}

/** Pernas medidas no protocolo. O agachamento é uma série única, fora desta spec (spec 014). */
export function pernasDoProtocolo(protocolo: Protocol): PernaTentativa[] {
  const info = PROTOCOLOS[protocolo];
  if (info.agachamento) return [];
  return info.unilateral ? ['direita', 'esquerda'] : ['unica'];
}

export function criarTentativasVazias(protocolo: Protocol): TentativasPorPerna {
  const tentativas: TentativasPorPerna = {};
  for (const perna of pernasDoProtocolo(protocolo)) {
    tentativas[perna] = Array.from({ length: TENTATIVAS_POR_PERNA }, tentativaVazia);
  }
  return tentativas;
}

/** Vídeo novo (escolhido ou trocado): FPS lido pré-selecionado, nada confirmado, marcas zeradas. */
export function definirVideo(
  _tentativa: TentativaEmAndamento,
  video: VideoSelecionado,
): TentativaEmAndamento {
  return { video, fpsSelecionado: video.fpsLido, fpsConfirmado: null, marcas: {} };
}

export function selecionarFps(tentativa: TentativaEmAndamento, fps: number): TentativaEmAndamento {
  return { ...tentativa, fpsSelecionado: fps };
}

/** Confirma o FPS selecionado; sem efeito se ele não puder ser confirmado (D2, HU005 RN08). */
export function confirmarFps(tentativa: TentativaEmAndamento): TentativaEmAndamento {
  if (!podeConfirmarFps(tentativa.fpsSelecionado)) return tentativa;
  return { ...tentativa, fpsConfirmado: tentativa.fpsSelecionado };
}

/** Volta ao seletor mantendo a seleção atual e as marcas já feitas. */
export function trocarFps(tentativa: TentativaEmAndamento): TentativaEmAndamento {
  return { ...tentativa, fpsConfirmado: null };
}

/** As marcações só valem com o FPS confirmado (HU005 RN05). */
export function marcacoesLiberadas(tentativa: TentativaEmAndamento): boolean {
  return tentativa.fpsConfirmado !== null;
}

/** URIs únicas das cópias temporárias, para apagar ao fim da avaliação (D14). */
export function videosTemporarios(tentativas: TentativasPorPerna): string[] {
  const uris = new Set<string>();
  for (const lista of Object.values(tentativas)) {
    for (const tentativa of lista ?? []) {
      if (tentativa.video?.temporario) uris.add(tentativa.video.uri);
    }
  }
  return [...uris];
}
