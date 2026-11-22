import type { DadosCriarConta, ErrosConta } from '@/types/conta';

const NOME_MINIMO = 2;
const NOME_MAXIMO = 120;
const EMAIL_MAXIMO = 254;
const SENHA_MINIMA = 8;
/** Limite do BCrypt na API, em bytes. */
const SENHA_MAXIMA_BYTES = 72;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MENSAGENS_CONTA = {
  nome: 'Informe seu nome.',
  nomeLongo: 'O nome pode ter no máximo 120 caracteres.',
  email: 'Informe um e-mail válido.',
  senhaCurta: 'A senha precisa ter pelo menos 8 caracteres.',
  senhaLonga: 'A senha pode ter no máximo 72 caracteres.',
  confirmacao: 'As senhas não conferem.',
  senhaVazia: 'Informe a senha.',
} as const;

/** E-mail sem espaços nas pontas e em minúsculas, como a API guarda. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function bytes(texto: string): number {
  return new TextEncoder().encode(texto).length;
}

function erroDoEmail(email: string): string | undefined {
  const normalizado = normalizarEmail(email);
  return normalizado.length > EMAIL_MAXIMO || !FORMATO_EMAIL.test(normalizado)
    ? MENSAGENS_CONTA.email
    : undefined;
}

export function validarCriarConta(dados: DadosCriarConta): ErrosConta {
  const erros: ErrosConta = {};
  const nome = dados.nome.trim();
  if (nome.length < NOME_MINIMO) erros.nome = MENSAGENS_CONTA.nome;
  else if (nome.length > NOME_MAXIMO) erros.nome = MENSAGENS_CONTA.nomeLongo;
  const email = erroDoEmail(dados.email);
  if (email) erros.email = email;
  if (dados.senha.length < SENHA_MINIMA) erros.senha = MENSAGENS_CONTA.senhaCurta;
  else if (bytes(dados.senha) > SENHA_MAXIMA_BYTES) erros.senha = MENSAGENS_CONTA.senhaLonga;
  if (dados.confirmacao !== dados.senha) erros.confirmacao = MENSAGENS_CONTA.confirmacao;
  return erros;
}

/** No Entrar, só e-mail e senha preenchidos; o resto quem decide é a API. */
export function validarEntrar(email: string, senha: string): ErrosConta {
  const erros: ErrosConta = {};
  if (normalizarEmail(email) === '') erros.email = MENSAGENS_CONTA.email;
  if (senha === '') erros.senha = MENSAGENS_CONTA.senhaVazia;
  return erros;
}
