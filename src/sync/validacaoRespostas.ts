import type { Sessao } from '@/types/conta';

export class RespostaInvalidaError extends Error {
  constructor() {
    super('Resposta inesperada do servidor.');
    this.name = 'RespostaInvalidaError';
  }
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

const texto = (valor: unknown): valor is string => typeof valor === 'string' && valor !== '';

/** `dados` do envelope ApiResponse com um SessaoDTO; lança RespostaInvalidaError fora do formato. */
export function lerRespostaSessao(corpo: unknown): Sessao {
  const dados = objeto(objeto(corpo)?.dados);
  const conta = objeto(dados?.conta);
  if (
    !dados ||
    !conta ||
    !texto(dados.tokenAcesso) ||
    !texto(dados.tokenRenovacao) ||
    typeof conta.nome !== 'string' ||
    !texto(conta.email) ||
    typeof conta.admin !== 'boolean'
  ) {
    throw new RespostaInvalidaError();
  }
  return {
    tokenAcesso: dados.tokenAcesso,
    tokenRenovacao: dados.tokenRenovacao,
    conta: { nome: conta.nome, email: conta.email, admin: conta.admin },
  };
}

/** `mensagem` do envelope de erro, ou null. */
export function lerMensagemErro(corpo: unknown): string | null {
  const mensagem = objeto(corpo)?.mensagem;
  return texto(mensagem) ? mensagem : null;
}
