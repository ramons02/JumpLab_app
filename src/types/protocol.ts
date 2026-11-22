export type Protocol = 'cmj_bi' | 'cmj_uni' | 'sj' | 'dj' | 'dj_uni' | 'agach';

export interface InfoProtocolo {
  nome: string;
  descricao: string;
  /** Uma série de tentativas por perna; tem LSI. */
  unilateral: boolean;
  /** Pede o toque no solo; tem tempo de contato e RSI. */
  dropJump: boolean;
  /** Pede carga; mede repetições (D8). */
  agachamento: boolean;
}
