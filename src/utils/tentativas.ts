import type {
  Attempt,
  MarcasSalto,
  NumeroTentativa,
  PernaTentativa,
  TentativaEmAndamento,
  TentativasPorPerna,
  VideoSelecionado,
} from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { podeConfirmarFps } from '@/utils/fps';
import { tentativaCompleta } from '@/utils/marcacoes';
import { PROTOCOLOS } from '@/utils/protocolos';

/** Tentativas obrigatórias por perna (D11). */
export const TENTATIVAS_POR_PERNA = 3;

function tentativaVazia(): TentativaEmAndamento {
  return { video: null, fpsSelecionado: null, fpsConfirmado: null, marcas: {} };
}

/** Pernas medidas no salto. O agachamento não tem pernas: é uma série única (spec 014). */
export function pernasDoProtocolo(protocolo: Protocol): PernaTentativa[] {
  const info = PROTOCOLOS[protocolo];
  if (info.agachamento) return [];
  return info.unilateral ? ['direita', 'esquerda'] : ['unica'];
}

export function criarTentativasVazias(protocolo: Protocol): TentativasPorPerna {
  // Agachamento: série única, com um só vídeo na tentativa `unica` (spec 014).
  if (PROTOCOLOS[protocolo].agachamento) return { unica: [tentativaVazia()] };
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

export function marcarNaTentativa(
  tentativa: TentativaEmAndamento,
  marcas: MarcasSalto,
): TentativaEmAndamento {
  return { ...tentativa, marcas };
}

/** `Mesmo vídeo da tentativa anterior`: vídeo e FPS confirmado da anterior, sem as marcações. */
export function usarVideoDaAnterior(
  anterior: TentativaEmAndamento,
  _atual: TentativaEmAndamento,
): TentativaEmAndamento {
  return {
    video: anterior.video,
    fpsSelecionado: anterior.fpsSelecionado,
    fpsConfirmado: anterior.fpsConfirmado,
    marcas: {},
  };
}

/** A tentativa como `Attempt` (para medir a prévia ou gravar); null se ainda não estiver completa. */
export function paraAttempt(
  tentativa: TentativaEmAndamento,
  perna: PernaTentativa,
  numero: NumeroTentativa,
  protocolo: Protocol,
): Attempt | null {
  const { fpsConfirmado, marcas } = tentativa;
  if (
    !tentativaCompleta(tentativa, protocolo) ||
    fpsConfirmado === null ||
    marcas.decolagem === undefined ||
    marcas.aterrissagem === undefined
  ) {
    return null;
  }
  return {
    perna,
    numero,
    fps: fpsConfirmado,
    quadroToque: marcas.toque ?? null,
    quadroDecolagem: marcas.decolagem,
    quadroAterrissagem: marcas.aterrissagem,
  };
}

/** Tentativas completas no formato gravado pela spec 008; lança erro se alguma estiver incompleta. */
export function tentativasConcluidas(
  tentativas: TentativasPorPerna,
  protocolo: Protocol,
): Attempt[] {
  return pernasDoProtocolo(protocolo).flatMap((perna) =>
    (tentativas[perna] ?? []).map((tentativa, indice): Attempt => {
      const concluida = paraAttempt(tentativa, perna, (indice + 1) as NumeroTentativa, protocolo);
      if (!concluida) {
        throw new Error(`A tentativa ${indice + 1} (${perna}) ainda não está completa.`);
      }
      return concluida;
    }),
  );
}
