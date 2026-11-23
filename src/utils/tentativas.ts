import type {
  Attempt,
  MarcasSalto,
  NumeroTentativa,
  PernaTentativa,
  SugestaoQuadros,
  TentativaEmAndamento,
  TentativasPorPerna,
  VideoSelecionado,
} from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { FPS_GRAVACAO_PADRAO, podeConfirmarFps } from '@/utils/fps';
import { eventosDoProtocolo, tentativaCompleta } from '@/utils/marcacoes';
import { PROTOCOLOS } from '@/utils/protocolos';

/** Tentativas obrigatórias por perna (D11). */
export const TENTATIVAS_POR_PERNA = 3;

function tentativaVazia(): TentativaEmAndamento {
  return { video: null, fpsSelecionado: null, fpsConfirmado: null, marcas: {}, sugestao: null };
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

/**
 * Vídeo novo (escolhido ou trocado): o FPS lido nos dados do arquivo já vem confirmado; sem leitura,
 * vale o padrão de 120 fps (D22). O seletor só aparece em Trocar FPS ou quando a leitura dá menos de
 * 60 fps. Marcas zeradas e sem sugestão, porque a sugestão pertence ao vídeo (spec 018, RN10).
 */
export function definirVideo(
  _tentativa: TentativaEmAndamento,
  video: VideoSelecionado,
): TentativaEmAndamento {
  const fps = video.fpsLido ?? FPS_GRAVACAO_PADRAO;
  const fpsConfirmado = podeConfirmarFps(fps) ? fps : null;
  return { video, fpsSelecionado: fps, fpsConfirmado, marcas: {}, sugestao: null };
}

/** Troca a sugestão automática da tentativa, sem tocar em vídeo, FPS ou marcas (spec 018). */
export function definirSugestao(
  tentativa: TentativaEmAndamento,
  sugestao: SugestaoQuadros | null,
): TentativaEmAndamento {
  return { ...tentativa, sugestao };
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

/**
 * `Mesmo vídeo da tentativa anterior`: vídeo e FPS confirmado da anterior, sem as marcações; a sugestão
 * pronta daquele vídeo vem junto, sem nova análise (spec 018, RN10).
 */
export function usarVideoDaAnterior(
  anterior: TentativaEmAndamento,
  _atual: TentativaEmAndamento,
): TentativaEmAndamento {
  return {
    video: anterior.video,
    fpsSelecionado: anterior.fpsSelecionado,
    fpsConfirmado: anterior.fpsConfirmado,
    marcas: {},
    sugestao: anterior.sugestao?.estado === 'pronta' ? anterior.sugestao : null,
  };
}

/** Quadros da sugestão pronta, só dos eventos do protocolo; vazio sem sugestão. */
function quadrosSugeridosDaTentativa(
  tentativa: TentativaEmAndamento,
  protocolo: Protocol,
): MarcasSalto {
  const { sugestao } = tentativa;
  if (sugestao?.estado !== 'pronta') return {};
  const quadros: MarcasSalto = {};
  for (const evento of eventosDoProtocolo(protocolo)) {
    const quadro = sugestao.quadros[evento];
    if (quadro !== undefined) quadros[evento] = quadro;
  }
  return quadros;
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
    quadrosSugeridos: quadrosSugeridosDaTentativa(tentativa, protocolo),
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

export interface PosicaoTentativa {
  perna: PernaTentativa;
  numero: NumeroTentativa;
}

/**
 * Próxima tentativa incompleta para o botão do rodapé (D23): primeiro as outras tentativas da perna
 * atual, em ordem, depois as das outras pernas. Null quando só falta a atual ou nada falta.
 */
export function proximaTentativaIncompleta(
  tentativas: TentativasPorPerna,
  protocolo: Protocol,
  atual: PosicaoTentativa,
): PosicaoTentativa | null {
  const pernas = pernasDoProtocolo(protocolo);
  const ordem = [atual.perna, ...pernas.filter((p) => p !== atual.perna)];
  for (const perna of ordem) {
    const lista = tentativas[perna] ?? [];
    const indice = lista.findIndex(
      (t, i) =>
        !(perna === atual.perna && i + 1 === atual.numero) && !tentativaCompleta(t, protocolo),
    );
    if (indice >= 0) return { perna, numero: (indice + 1) as NumeroTentativa };
  }
  return null;
}
