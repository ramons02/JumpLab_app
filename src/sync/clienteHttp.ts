import type { Sessao } from '@/types/conta';
import { apagarSessao, gravarSessao, lerSessao } from '@/sync/armazenamentoSessao';
import { urlBaseApi } from '@/sync/config';
import { lerRespostaSessao, lerMensagemErro } from '@/sync/validacaoRespostas';

export type ResultadoHttp<T> =
  | { tipo: 'ok'; dados: T }
  | { tipo: 'erro'; status: number; mensagem: string }
  | { tipo: 'sem-conexao' }
  | { tipo: 'sessao-encerrada' };

interface OpcoesChamada {
  metodo: 'GET' | 'POST';
  corpo?: unknown;
  autenticada: boolean;
}

export const TEMPO_LIMITE_MS = 15_000;
const NAO_AUTORIZADO = 401;
const MENSAGEM_ERRO_PADRAO = 'Erro inesperado. Tente de novo.';
const MENSAGEM_RESPOSTA_INVALIDA = 'Resposta inesperada do servidor.';

type Resposta = { status: number; ok: boolean; corpo: unknown } | 'sem-conexao';

/* Quem precisa saber que a sessão acabou (o provedor de sessão) se inscreve aqui. */
const ouvintesEncerramento = new Set<() => void>();
export function aoEncerrarSessao(ouvinte: () => void): () => void {
  ouvintesEncerramento.add(ouvinte);
  return () => ouvintesEncerramento.delete(ouvinte);
}

async function requisitar(
  caminho: string,
  metodo: 'GET' | 'POST',
  corpo: unknown,
  token: string | null,
): Promise<Resposta> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const cabecalhos: Record<string, string> = { Accept: 'application/json' };
    if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
    if (token) cabecalhos.Authorization = `Bearer ${token}`;
    const resposta = await fetch(`${urlBaseApi()}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controle.signal,
    });
    const textoCorpo = await resposta.text();
    let json: unknown = null;
    try {
      json = textoCorpo ? JSON.parse(textoCorpo) : null;
    } catch {
      json = null;
    }
    return { status: resposta.status, ok: resposta.ok, corpo: json };
  } catch {
    // Falha de rede, tempo esgotado ou endereço não configurado: o app segue offline.
    return 'sem-conexao';
  } finally {
    clearTimeout(limite);
  }
}

type ResultadoRenovacao =
  { tipo: 'ok'; sessao: Sessao } | { tipo: 'recusada' } | { tipo: 'sem-conexao' };

let renovacaoEmAndamento: Promise<ResultadoRenovacao> | null = null;

async function encerrarSessao() {
  await apagarSessao();
  ouvintesEncerramento.forEach((ouvinte) => ouvinte());
}

/** Uma renovação por vez: chamadas simultâneas com 401 esperam a mesma. */
function renovar(): Promise<ResultadoRenovacao> {
  renovacaoEmAndamento ??= (async (): Promise<ResultadoRenovacao> => {
    const atual = await lerSessao();
    if (!atual) return { tipo: 'recusada' };
    const resposta = await requisitar(
      '/api/auth/renovar',
      'POST',
      { tokenRenovacao: atual.tokenRenovacao },
      null,
    );
    if (resposta === 'sem-conexao') return { tipo: 'sem-conexao' };
    if (!resposta.ok) return { tipo: 'recusada' };
    try {
      const sessao = lerRespostaSessao(resposta.corpo);
      await gravarSessao(sessao);
      return { tipo: 'ok', sessao };
    } catch {
      return { tipo: 'recusada' };
    }
  })().finally(() => {
    renovacaoEmAndamento = null;
  });
  return renovacaoEmAndamento;
}

function paraResultado<T>(
  resposta: Exclude<Resposta, 'sem-conexao'>,
  lerDados: (corpo: unknown) => T,
): ResultadoHttp<T> {
  if (!resposta.ok) {
    return {
      tipo: 'erro',
      status: resposta.status,
      mensagem: lerMensagemErro(resposta.corpo) ?? MENSAGEM_ERRO_PADRAO,
    };
  }
  try {
    return { tipo: 'ok', dados: lerDados(resposta.corpo) };
  } catch {
    return { tipo: 'erro', status: resposta.status, mensagem: MENSAGEM_RESPOSTA_INVALIDA };
  }
}

/**
 * Única porta do app para a API. Chamada autenticada leva o token de acesso; um 401 renova uma vez e
 * repete; renovação recusada apaga a sessão e devolve `sessao-encerrada`. Nunca registra token em log.
 */
export async function chamarApi<T>(
  caminho: string,
  opcoes: OpcoesChamada,
  lerDados: (corpo: unknown) => T,
): Promise<ResultadoHttp<T>> {
  if (!opcoes.autenticada) {
    const resposta = await requisitar(caminho, opcoes.metodo, opcoes.corpo, null);
    return resposta === 'sem-conexao' ? { tipo: 'sem-conexao' } : paraResultado(resposta, lerDados);
  }

  const sessao = await lerSessao();
  if (!sessao) return { tipo: 'sessao-encerrada' };
  const primeira = await requisitar(caminho, opcoes.metodo, opcoes.corpo, sessao.tokenAcesso);
  if (primeira === 'sem-conexao') return { tipo: 'sem-conexao' };
  if (primeira.status !== NAO_AUTORIZADO) return paraResultado(primeira, lerDados);

  const renovacao = await renovar();
  if (renovacao.tipo === 'sem-conexao') return { tipo: 'sem-conexao' };
  if (renovacao.tipo === 'recusada') {
    await encerrarSessao();
    return { tipo: 'sessao-encerrada' };
  }
  const segunda = await requisitar(
    caminho,
    opcoes.metodo,
    opcoes.corpo,
    renovacao.sessao.tokenAcesso,
  );
  if (segunda === 'sem-conexao') return { tipo: 'sem-conexao' };
  if (segunda.status === NAO_AUTORIZADO) {
    await encerrarSessao();
    return { tipo: 'sessao-encerrada' };
  }
  return paraResultado(segunda, lerDados);
}
