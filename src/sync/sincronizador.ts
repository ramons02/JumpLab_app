import type { ConexaoBanco } from '@/database/conexao';
import {
  aplicarAvaliacaoRecebida,
  aplicarPacienteRecebido,
  gravarEstadoSync,
  lerEstadoSync,
  listarAvaliacoesPendentes,
  listarPacientesPendentes,
  marcarSincronizado,
} from '@/database/sincronizacao';
import { enviarLote, receberPagina } from '@/sync/apiSincronizacao';
import { lerSessao } from '@/sync/armazenamentoSessao';
import type { ResultadoHttp } from '@/sync/clienteHttp';
import { contemChaveDeVideo } from '@/sync/serializacao';
import { validarAvaliacaoRecebida, validarPacienteRecebido } from '@/sync/validacaoRespostas';
import type { RegistroSync } from '@/types/sincronizacao';

export type MotivoSync = 'abertura' | 'retorno-ao-app' | 'login' | 'avaliacao-salva' | 'manual';

export interface ResultadoSync {
  enviados: number;
  recebidos: number;
  recusados: number;
  erro: string | null;
}

export const LIMITE_LOTE = 100;
export const MENSAGEM_OUTRA_CONTA = 'Este aparelho tem dados de outra conta.';
export const MENSAGEM_SEM_CONEXAO = 'Sem conexão.';
export const MENSAGEM_SESSAO_EXPIRADA = 'Sessão expirada. Entre de novo.';
export const MENSAGEM_RECEBIDO_INVALIDO = 'Dados recebidos em formato inesperado.';
export const MENSAGEM_VIDEO = 'Registro com vídeo não é enviado.';

/** Motivo legível de uma chamada que não deu certo (sem dados de paciente). */
function erroDaChamada(resultado: Exclude<ResultadoHttp<unknown>, { tipo: 'ok' }>): string {
  if (resultado.tipo === 'sem-conexao') return MENSAGEM_SEM_CONEXAO;
  if (resultado.tipo === 'sessao-encerrada') return MENSAGEM_SESSAO_EXPIRADA;
  return resultado.mensagem;
}

class ErroRodada extends Error {}

/** Passo 2: envia os pendentes em lotes, pacientes primeiro, até não restar nada para enviar. */
async function enviarPendentes(db: ConexaoBanco, resultado: ResultadoSync) {
  for (;;) {
    const pacientes = await listarPacientesPendentes(db, LIMITE_LOTE);
    const espaco = LIMITE_LOTE - pacientes.length;
    const avaliacoes = espaco > 0 ? await listarAvaliacoesPendentes(db, espaco) : [];
    const lote = { pacientes, avaliacoes };
    if (pacientes.length + avaliacoes.length === 0) return;
    // D14: nenhum vídeo sobe. Não acontece com o banco do app; fica como trava.
    if ([...pacientes, ...avaliacoes].some((r) => contemChaveDeVideo(r.conteudo))) {
      throw new ErroRodada(MENSAGEM_VIDEO);
    }

    const resposta = await enviarLote(lote);
    if (resposta.tipo !== 'ok') throw new ErroRodada(erroDaChamada(resposta));

    const enviadosPorId = new Map<string, RegistroSync>(
      [...pacientes, ...avaliacoes].map((r) => [`${r.tipo}:${r.id}`, r]),
    );
    let recusados = 0;
    let motivo: string | null = null;
    for (const r of resposta.dados) {
      const enviado = enviadosPorId.get(`${r.tipo}:${r.id}`);
      if (!enviado) continue;
      if (r.situacao === 'recusado') {
        recusados += 1;
        motivo ??= r.motivo;
        continue;
      }
      await marcarSincronizado(db, r.tipo, r.id, enviado.atualizadoEm);
      resultado.enviados += 1;
    }
    if (recusados > 0) {
      // Sai do laço para não repetir o mesmo lote: os recusados seguem pendentes.
      resultado.recusados += recusados;
      throw new ErroRodada(motivo ?? 'Registro recusado pela API.');
    }
  }
}

/** Passo 3: recebe as páginas desde o cursor e aplica, pacientes antes das avaliações. */
async function receberAlteracoes(
  db: ConexaoBanco,
  cursorInicial: number,
  resultado: ResultadoSync,
) {
  let cursor = cursorInicial;
  for (;;) {
    const resposta = await receberPagina(cursor);
    if (resposta.tipo !== 'ok') throw new ErroRodada(erroDaChamada(resposta));
    const pagina = resposta.dados;
    for (const p of pagina.pacientes) {
      if (!validarPacienteRecebido(p.conteudo) || p.conteudo.id !== p.id) {
        throw new ErroRodada(MENSAGEM_RECEBIDO_INVALIDO);
      }
      if ((await aplicarPacienteRecebido(db, p)) === 'gravado') resultado.recebidos += 1;
    }
    for (const a of pagina.avaliacoes) {
      if (!validarAvaliacaoRecebida(a.conteudo)) throw new ErroRodada(MENSAGEM_RECEBIDO_INVALIDO);
      if ((await aplicarAvaliacaoRecebida(db, a)) === 'gravado') resultado.recebidos += 1;
    }
    // O cursor só avança depois da página inteira aplicada: um erro no meio repete a página.
    cursor = pagina.cursor;
    await gravarEstadoSync(db, { cursorServidor: cursor });
    if (!pagina.temMais) return;
  }
}

async function rodada(db: ConexaoBanco, contaEmail: string): Promise<ResultadoSync> {
  const resultado: ResultadoSync = { enviados: 0, recebidos: 0, recusados: 0, erro: null };
  // Sessão aberta pela senha temporária: a API recusaria; sincroniza depois da senha nova (spec 016).
  if ((await lerSessao())?.conta.trocaSenhaObrigatoria) return resultado;
  const estado = await lerEstadoSync(db);
  if (estado.usuarioEmail !== null && estado.usuarioEmail !== contaEmail) {
    await gravarEstadoSync(db, { ultimoResultado: 'erro', ultimoErro: MENSAGEM_OUTRA_CONTA });
    return { ...resultado, erro: MENSAGEM_OUTRA_CONTA };
  }
  try {
    await enviarPendentes(db, resultado);
    await receberAlteracoes(db, estado.cursorServidor, resultado);
    await gravarEstadoSync(db, {
      usuarioEmail: contaEmail,
      ultimaSincronizacao: new Date().toISOString(),
      ultimoResultado: 'ok',
      ultimoErro: null,
    });
  } catch (erro) {
    const motivo = erro instanceof ErroRodada ? erro.message : MENSAGEM_RECEBIDO_INVALIDO;
    // A conta vira dona já na primeira tentativa que chegou a falar com a API.
    const alteracao = { ultimoResultado: 'erro' as const, ultimoErro: motivo };
    await gravarEstadoSync(
      db,
      resultado.enviados + resultado.recebidos > 0
        ? { ...alteracao, usuarioEmail: contaEmail }
        : alteracao,
    );
    resultado.erro = motivo;
  }
  return resultado;
}

let rodadaAtual: Promise<ResultadoSync> | null = null;
let rodarDeNovo = false;

/**
 * Uma rodada por vez. Chamada durante uma rodada marca "rodar de novo" e devolve a mesma promessa;
 * ao terminar, roda mais uma vez para pegar o que mudou no meio (research R9).
 */
export function sincronizar(
  db: ConexaoBanco,
  contaEmail: string,
  _motivo: MotivoSync,
): Promise<ResultadoSync> {
  if (rodadaAtual) {
    rodarDeNovo = true;
    return rodadaAtual;
  }
  rodadaAtual = (async () => {
    let resultado: ResultadoSync;
    do {
      rodarDeNovo = false;
      resultado = await rodada(db, contaEmail);
    } while (rodarDeNovo);
    return resultado;
  })().finally(() => {
    rodadaAtual = null;
  });
  return rodadaAtual;
}

export function sincronizacaoEmAndamento(): boolean {
  return rodadaAtual !== null;
}
