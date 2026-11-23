import type { Sessao } from '@/types/conta';
import { apagarSessao, gravarSessao, lerSessao } from '@/sync/armazenamentoSessao';
import { chamarApi, TEMPO_LIMITE_ACORDAR_MS, type ResultadoHttp } from '@/sync/clienteHttp';
import { lerRespostaSessao } from '@/sync/validacaoRespostas';
import { normalizarEmail } from '@/utils/validacaoConta';

export const MENSAGEM_CREDENCIAIS = 'E-mail ou senha inválidos.';
const NAO_AUTORIZADO = 401;

async function guardarSeOk(resultado: ResultadoHttp<Sessao>): Promise<ResultadoHttp<Sessao>> {
  if (resultado.tipo === 'ok') await gravarSessao(resultado.dados);
  return resultado;
}

/** Cria a conta e já entra nela (RN08, RN09). */
export async function criarConta(dados: {
  nome: string;
  email: string;
  senha: string;
}): Promise<ResultadoHttp<Sessao>> {
  return guardarSeOk(
    await chamarApi(
      '/api/auth/cadastro',
      {
        metodo: 'POST',
        corpo: { nome: dados.nome.trim(), email: normalizarEmail(dados.email), senha: dados.senha },
        autenticada: false,
        tempoLimiteMs: TEMPO_LIMITE_ACORDAR_MS,
      },
      lerRespostaSessao,
    ),
  );
}

/** Entra; credenciais erradas sempre com a mesma mensagem genérica (RN04). */
export async function entrar(email: string, senha: string): Promise<ResultadoHttp<Sessao>> {
  const resultado = await chamarApi(
    '/api/auth/entrar',
    {
      metodo: 'POST',
      corpo: { email: normalizarEmail(email), senha },
      autenticada: false,
      tempoLimiteMs: TEMPO_LIMITE_ACORDAR_MS,
    },
    lerRespostaSessao,
  );
  if (resultado.tipo === 'erro' && resultado.status === NAO_AUTORIZADO) {
    return { ...resultado, mensagem: MENSAGEM_CREDENCIAIS };
  }
  return guardarSeOk(resultado);
}

/** Apaga a sessão local sempre; revoga o token de renovação na API quando houver conexão. */
export async function sair(): Promise<void> {
  const sessao = await lerSessao();
  await apagarSessao();
  if (!sessao) return;
  await chamarApi(
    '/api/auth/sair',
    { metodo: 'POST', corpo: { tokenRenovacao: sessao.tokenRenovacao }, autenticada: false },
    () => null,
  );
}
