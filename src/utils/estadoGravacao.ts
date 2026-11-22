import { taxaEhSuportada, taxaNegociadaAtende, type TaxaAlta } from '@/utils/taxaGravacao';

export type EstadoGravacao =
  | 'sem_permissao'
  | 'permissao_negada'
  | 'sem_alta_velocidade'
  | 'preparando'
  | 'pronta'
  | 'taxa_nao_suportada'
  | 'gravando'
  | 'erro';

export interface SituacaoCamera {
  temPermissao: boolean;
  podePedirPermissao: boolean;
  /** Taxas lidas da câmera; null enquanto ela ainda responde. */
  erro: boolean;
  gravando: boolean;
  taxa: TaxaAlta | null;
  suportadas: readonly TaxaAlta[] | null;
  /** Taxa que a câmera escolheu para a taxa pedida; ausente enquanto ela configura. */
  negociada: { pedida: TaxaAlta; fps: number | undefined } | null;
}

/** Estado da tela de gravação (data-model): só `pronta` libera o botão de gravar. */
export function estadoDaGravacao(s: SituacaoCamera): EstadoGravacao {
  if (!s.temPermissao) return s.podePedirPermissao ? 'sem_permissao' : 'permissao_negada';
  if (s.erro) return 'erro';
  if (s.gravando) return 'gravando';
  if (s.suportadas === null) return 'preparando';
  if (s.taxa === null) return 'sem_alta_velocidade';
  if (!taxaEhSuportada(s.taxa, s.suportadas)) return 'taxa_nao_suportada';
  if (s.negociada === null || s.negociada.pedida !== s.taxa) return 'preparando';
  return taxaNegociadaAtende(s.taxa, s.negociada.fps) ? 'pronta' : 'taxa_nao_suportada';
}

/** Alternativa oferecida no aviso: a maior taxa suportada abaixo da escolhida. */
export function taxaAlternativa(taxa: TaxaAlta, suportadas: readonly TaxaAlta[]): TaxaAlta | null {
  const menores = suportadas.filter((t) => t < taxa);
  return menores.length > 0 ? menores[menores.length - 1] : null;
}
