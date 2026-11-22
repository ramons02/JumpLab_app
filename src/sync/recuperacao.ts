import { gravarSessao } from '@/sync/armazenamentoSessao';
import { chamarApi, type ResultadoHttp } from '@/sync/clienteHttp';
import { lerRespostaSessao } from '@/sync/validacaoRespostas';
import type { Sessao } from '@/types/conta';
import { normalizarEmail } from '@/utils/validacaoConta';

/** Pede a recuperação (sem token); a API responde igual com ou sem conta (spec 016, RN02). */
export async function pedirRecuperacao(email: string): Promise<ResultadoHttp<null>> {
  return chamarApi(
    '/api/recuperacao/pedidos',
    { metodo: 'POST', corpo: { email: normalizarEmail(email) }, autenticada: false },
    () => null,
  );
}

/** Cria a senha nova na sessão aberta pela temporária e guarda a sessão normal que volta. */
export async function criarSenhaNova(senhaNova: string): Promise<ResultadoHttp<Sessao>> {
  const resultado = await chamarApi(
    '/api/conta/senha',
    { metodo: 'POST', corpo: { senhaNova }, autenticada: true },
    lerRespostaSessao,
  );
  if (resultado.tipo === 'ok') await gravarSessao(resultado.dados);
  return resultado;
}
