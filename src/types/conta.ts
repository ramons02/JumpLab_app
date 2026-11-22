export interface Conta {
  nome: string;
  email: string;
  admin: boolean;
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
