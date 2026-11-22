import * as SecureStore from 'expo-secure-store';

import type { Conta, Sessao } from '@/types/conta';

const CHAVE_ACESSO = 'jumplab.tokenAcesso';
const CHAVE_RENOVACAO = 'jumplab.tokenRenovacao';
const CHAVE_CONTA = 'jumplab.conta';

function ehConta(valor: unknown): valor is Conta {
  if (typeof valor !== 'object' || valor === null) return false;
  const c = valor as Record<string, unknown>;
  return typeof c.nome === 'string' && typeof c.email === 'string' && typeof c.admin === 'boolean';
}

/** Sessão guardada no armazenamento seguro; conteúdo ausente ou corrompido é tratado como sem sessão. */
export async function lerSessao(): Promise<Sessao | null> {
  const [tokenAcesso, tokenRenovacao, contaJson] = await Promise.all([
    SecureStore.getItemAsync(CHAVE_ACESSO),
    SecureStore.getItemAsync(CHAVE_RENOVACAO),
    SecureStore.getItemAsync(CHAVE_CONTA),
  ]);
  if (!tokenAcesso || !tokenRenovacao || !contaJson) return null;
  try {
    const conta: unknown = JSON.parse(contaJson);
    return ehConta(conta) ? { tokenAcesso, tokenRenovacao, conta } : null;
  } catch {
    return null;
  }
}

export async function gravarSessao(sessao: Sessao): Promise<void> {
  await SecureStore.setItemAsync(CHAVE_ACESSO, sessao.tokenAcesso);
  await SecureStore.setItemAsync(CHAVE_RENOVACAO, sessao.tokenRenovacao);
  await SecureStore.setItemAsync(
    CHAVE_CONTA,
    JSON.stringify({
      nome: sessao.conta.nome,
      email: sessao.conta.email,
      admin: sessao.conta.admin,
    }),
  );
}

export async function apagarSessao(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(CHAVE_ACESSO),
    SecureStore.deleteItemAsync(CHAVE_RENOVACAO),
    SecureStore.deleteItemAsync(CHAVE_CONTA),
  ]);
}
