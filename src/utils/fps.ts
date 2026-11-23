/** Opções do seletor sempre presentes. */
export const FPS_PADRAO: readonly number[] = [60, 120, 240];
/** Taxa assumida quando os dados do vídeo não trazem a taxa de gravação (D22). */
export const FPS_GRAVACAO_PADRAO = 120;
/** Abaixo disso não confirma (HU005 RN08); igual a isso é baixa precisão (D3). */
export const FPS_MINIMO = 60;

export type AvisoFps = 'baixa_precisao' | 'nao_confiavel';

export const MENSAGEM_AVISO_FPS: Record<AvisoFps, string> = {
  baixa_precisao:
    'A 60 fps cada quadro vale 16,7 ms: a altura terá margem de cerca de ±2 cm e a avaliação será marcada como baixa precisão.',
  nao_confiavel: 'Abaixo de 60 fps a medida não é confiável. Use outro vídeo, em câmera lenta.',
};

/** Taxa lida nos dados do vídeo, arredondada; ausente ou inválida vira null. */
export function normalizarFpsLido(valor: unknown): number | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return null;
  return Math.round(valor);
}

/** O que se leu do arquivo para chegar à taxa de gravação (D22). */
export interface LeituraDaTaxa {
  /** Taxa de captura gravada pela câmera lenta, se houver. */
  taxaDeCaptura: number | null;
  /** Quadros da faixa de vídeo e a duração dela, em segundos. */
  quadros: number | null;
  duracaoS: number | null;
  /** Taxa declarada na faixa (pelo sistema ou pelo tocador). */
  taxaDaFaixa: number | null;
}

function positivo(valor: number | null): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

/** Taxa em que os quadros estão no arquivo: contagem pela duração; sem ela, a declarada na faixa. */
export function taxaDoArquivo(leitura: LeituraDaTaxa): number | null {
  if (positivo(leitura.quadros) && positivo(leitura.duracaoS)) {
    return normalizarFpsLido(leitura.quadros / leitura.duracaoS);
  }
  return normalizarFpsLido(leitura.taxaDaFaixa);
}

/**
 * Taxa real de gravação, usada nas contas (D22). Câmera lenta salva para tocar devagar guarda cada
 * quadro capturado e uma taxa de reprodução menor; nesse caso vale a taxa de captura. Sem ela, os
 * quadros estão em tempo real e vale a taxa do arquivo.
 */
export function taxaDeGravacao(leitura: LeituraDaTaxa): number | null {
  const doArquivo = taxaDoArquivo(leitura);
  const captura = normalizarFpsLido(leitura.taxaDeCaptura);
  if (captura !== null && (doArquivo === null || captura > doArquivo)) return captura;
  return doArquivo;
}

export function opcoesDeFps(fpsLido: number | null): number[] {
  const opcoes = new Set(FPS_PADRAO);
  if (fpsLido !== null) opcoes.add(fpsLido);
  return [...opcoes].sort((a, b) => a - b);
}

export function podeConfirmarFps(fps: number | null): boolean {
  return fps !== null && fps >= FPS_MINIMO;
}

/** Única regra de baixa precisão do app (D3). */
export function ehBaixaPrecisao(fps: number): boolean {
  return fps <= FPS_MINIMO;
}

export function avisoDoFps(fps: number | null, ehSalto: boolean): AvisoFps | null {
  if (fps === null) return null;
  if (fps < FPS_MINIMO) return 'nao_confiavel';
  if (ehSalto && ehBaixaPrecisao(fps)) return 'baixa_precisao';
  return null;
}
