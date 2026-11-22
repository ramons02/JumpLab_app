import type { VideoSelecionado } from '@/types/attempt';

/** Taxas de gravação em alta velocidade que o app oferece (HU011 RN01). */
export type TaxaAlta = 120 | 240;
export const TAXAS_ALTAS: readonly TaxaAlta[] = [120, 240];

/** Faixa de quadros por segundo que a câmera do aparelho alcança (`supportedFPSRanges`). */
export interface FaixaFps {
  max: number;
}

/** Taxas de `TAXAS_ALTAS` que alguma faixa da câmera alcança, em ordem crescente. */
export function taxasAltaSuportadas(faixas: readonly FaixaFps[]): TaxaAlta[] {
  return TAXAS_ALTAS.filter((taxa) => faixas.some((faixa) => faixa.max >= taxa));
}

/** 240 se suportada; senão 120; senão nenhuma. */
export function taxaInicial(suportadas: readonly TaxaAlta[]): TaxaAlta | null {
  if (suportadas.includes(240)) return 240;
  if (suportadas.includes(120)) return 120;
  return null;
}

export function taxaEhSuportada(taxa: TaxaAlta, suportadas: readonly TaxaAlta[]): boolean {
  return suportadas.includes(taxa);
}

/**
 * A câmera negocia a configuração e pode escolher uma taxa menor que a pedida. Só grava se a taxa
 * que ela de fato escolheu alcança a pedida; sem resposta da câmera, ainda não dá para saber (FR-003).
 */
export function taxaNegociadaAtende(pedida: TaxaAlta, negociada: number | undefined): boolean {
  return negociada !== undefined && negociada >= pedida;
}

/**
 * Vídeo da tentativa a partir da gravação já guardada em `cache/gravacoes/` (data-model). O FPS lido é
 * a taxa gravada, e ainda espera a confirmação do avaliador no seletor (D2).
 */
export function montarVideoGravado(
  uri: string,
  taxa: TaxaAlta,
  duracaoS: number,
  fpsDoArquivo: number | null,
): VideoSelecionado {
  return {
    uri,
    nome: `gravacao_${taxa}fps.mp4`,
    duracaoS,
    fpsLido: taxa,
    fpsDoArquivo: fpsDoArquivo ?? taxa,
    temporario: true,
  };
}
