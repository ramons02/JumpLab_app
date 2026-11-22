/** Opções do seletor sempre presentes. */
export const FPS_PADRAO: readonly number[] = [60, 120, 240];
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
