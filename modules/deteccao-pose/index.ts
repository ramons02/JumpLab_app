import { NativeModule, requireNativeModule } from 'expo';

import type { PontosDoQuadro } from '@/types/sugestao';

/*
 * Detecção dos pés no aparelho com o MediaPipe Pose Landmarker (spec 018, contrato em
 * contracts/modulos-internos.md). Só Android; o vídeo e os pontos não saem do celular.
 */

export interface EventoProgresso {
  idAnalise: string;
  /** De 0 a 1. */
  fracao: number;
}

type EventosDeteccaoPose = {
  progresso: (evento: EventoProgresso) => void;
};

declare class ModuloDeteccaoPose extends NativeModule<EventosDeteccaoPose> {
  analisarQuadros(
    idAnalise: string,
    uri: string,
    fpsDoArquivo: number,
    quadros: number[],
  ): Promise<PontosDoQuadro[]>;
  cancelarAnalise(idAnalise: string): void;
  totalDeQuadrosDoArquivo(uri: string): Promise<number>;
}

const modulo = requireNativeModule<ModuloDeteccaoPose>('DeteccaoPose');

/** Código da rejeição quando `cancelarAnalise` interrompe a análise. */
export const ANALISE_CANCELADA = 'ANALISE_CANCELADA';
/** Código da rejeição quando o vídeo não pode ser lido. */
export const VIDEO_ILEGIVEL = 'VIDEO_ILEGIVEL';

/** Lê os quadros dados (números inteiros, em ordem crescente) e devolve os pontos dos pés de cada um. */
export function analisarQuadros(
  idAnalise: string,
  uri: string,
  fpsDoArquivo: number,
  quadros: number[],
): Promise<PontosDoQuadro[]> {
  return modulo.analisarQuadros(idAnalise, uri, fpsDoArquivo, quadros);
}

export function cancelarAnalise(idAnalise: string): void {
  modulo.cancelarAnalise(idAnalise);
}

export function adicionarOuvinteProgresso(ouvinte: (evento: EventoProgresso) => void): {
  remove(): void;
} {
  return modulo.addListener('progresso', ouvinte);
}

export function totalDeQuadrosDoArquivo(uri: string): Promise<number> {
  return modulo.totalDeQuadrosDoArquivo(uri);
}
