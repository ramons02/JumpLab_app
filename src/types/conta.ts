export interface Conta {
  nome: string;
  email: string;
  admin: boolean;
  /** Entrou pela senha temporária: só pode criar a senha nova (spec 016). */
  trocaSenhaObrigatoria: boolean;
}

export interface Sessao {
  tokenAcesso: string;
  tokenRenovacao: string;
  conta: Conta;
}

export interface DadosCriarConta {
  nome: string;
  email: string;
  senha: string;
  confirmacao: string;
}

export type ErrosConta = Partial<Record<keyof DadosCriarConta, string>>;

export type StatusPedido = 'aberto' | 'atendido';

/** Pedido de recuperação de senha na caixa do administrador (spec 016). */
export interface PedidoRecuperacao {
  id: number;
  email: string;
  /** ISO 8601 */
  pedidoEm: string;
  status: StatusPedido;
  atendidoEm: string | null;
}

export interface SenhaTemporariaGerada {
  pedidoId: number;
  email: string;
  /** XXXX-XXXX; nunca gravada no aparelho */
  senhaTemporaria: string;
  /** ISO 8601 */
  validaAte: string;
}
