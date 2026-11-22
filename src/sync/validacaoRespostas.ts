import type { PedidoRecuperacao, SenhaTemporariaGerada, Sessao } from '@/types/conta';
import type {
  PaginaRecebimento,
  RegistroSync,
  ResultadoRegistro,
  SituacaoEnvio,
  TipoRegistro,
} from '@/types/sincronizacao';

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
    conta: {
      nome: conta.nome,
      email: conta.email,
      admin: conta.admin,
      // Ausente (API antes da spec 016) vira falso.
      trocaSenhaObrigatoria: dados.trocaSenhaObrigatoria === true,
    },
  };
}

/** `mensagem` do envelope de erro, ou null. */
export function lerMensagemErro(corpo: unknown): string | null {
  const mensagem = objeto(corpo)?.mensagem;
  return texto(mensagem) ? mensagem : null;
}

/* Sincronização (spec 013) */

const SITUACOES = new Set(['aceito', 'ignorado', 'recusado']);
const TIPOS = new Set(['paciente', 'avaliacao']);
const PERFIS = new Set(['pos_lca', 'corredor']);
const PERNAS = new Set(['direita', 'esquerda', 'nenhuma']);
const PROTOCOLOS_VALIDOS = new Set(['cmj_bi', 'cmj_uni', 'sj', 'dj', 'dj_uni', 'agach']);
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dataHoraIso = (v: unknown): v is string =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v));
const dataIso = (v: unknown): v is string => typeof v === 'string' && DATA.test(v);

/** `dados.resultados` de POST /api/sync/enviar. */
export function lerResultadoEnvio(corpo: unknown): ResultadoRegistro[] {
  const resultados = objeto(objeto(corpo)?.dados)?.resultados;
  if (!Array.isArray(resultados)) throw new RespostaInvalidaError();
  return resultados.map((item) => {
    const r = objeto(item);
    if (
      !r ||
      !TIPOS.has(String(r.tipo)) ||
      !texto(r.id) ||
      !SITUACOES.has(String(r.situacao)) ||
      !(r.motivo === null || r.motivo === undefined || typeof r.motivo === 'string')
    ) {
      throw new RespostaInvalidaError();
    }
    return {
      tipo: r.tipo as TipoRegistro,
      id: r.id,
      situacao: r.situacao as SituacaoEnvio,
      motivo: (r.motivo as string | null | undefined) ?? null,
    };
  });
}

function lerRegistros(lista: unknown, tipo: TipoRegistro): RegistroSync[] {
  if (!Array.isArray(lista)) throw new RespostaInvalidaError();
  return lista.map((item) => {
    const r = objeto(item);
    const conteudo = objeto(r?.conteudo);
    if (!r || !texto(r.id) || !dataHoraIso(r.atualizadoEm) || !conteudo)
      throw new RespostaInvalidaError();
    if (tipo === 'avaliacao' && !texto(r.pacienteId)) throw new RespostaInvalidaError();
    return {
      tipo,
      id: r.id,
      ...(tipo === 'avaliacao' ? { pacienteId: r.pacienteId as string } : {}),
      atualizadoEm: r.atualizadoEm,
      conteudo,
    };
  });
}

/** `dados` de GET /api/sync/receber. */
export function lerPaginaRecebimento(corpo: unknown): PaginaRecebimento {
  const dados = objeto(objeto(corpo)?.dados);
  if (
    !dados ||
    typeof dados.cursor !== 'number' ||
    !Number.isInteger(dados.cursor) ||
    dados.cursor < 0 ||
    typeof dados.temMais !== 'boolean'
  ) {
    throw new RespostaInvalidaError();
  }
  return {
    pacientes: lerRegistros(dados.pacientes, 'paciente'),
    avaliacoes: lerRegistros(dados.avaliacoes, 'avaliacao'),
    cursor: dados.cursor,
    temMais: dados.temMais,
  };
}

/** O conteúdo recebido tem a forma de uma linha de paciente (valores fechados e datas ISO). */
export function validarPacienteRecebido(conteudo: unknown): boolean {
  const c = objeto(conteudo);
  return (
    c !== null &&
    typeof c.id === 'string' &&
    UUID.test(c.id) &&
    typeof c.nome === 'string' &&
    c.nome.trim().length > 0 &&
    dataIso(c.data_nascimento) &&
    PERFIS.has(String(c.perfil)) &&
    PERNAS.has(String(c.perna_lesionada)) &&
    (c.data_lesao === null || dataIso(c.data_lesao)) &&
    dataHoraIso(c.criado_em) &&
    dataHoraIso(c.atualizado_em)
  );
}

/** O conteúdo recebido tem a forma do agregado da avaliação. */
export function validarAvaliacaoRecebida(conteudo: unknown): boolean {
  const c = objeto(conteudo);
  const a = objeto(c?.avaliacao);
  const serie = c?.serieAgachamento;
  return (
    c !== null &&
    a !== null &&
    typeof a.id === 'string' &&
    UUID.test(a.id) &&
    typeof a.paciente_id === 'string' &&
    PROTOCOLOS_VALIDOS.has(String(a.protocolo)) &&
    typeof a.data_hora === 'string' &&
    PERNAS.has(String(a.perna_lesionada)) &&
    typeof a.observacoes === 'string' &&
    typeof a.resultado_json === 'string' &&
    dataHoraIso(a.criado_em) &&
    dataHoraIso(a.atualizado_em) &&
    Array.isArray(c.tentativas) &&
    c.tentativas.every((t) => objeto(t) !== null) &&
    (serie === null || serie === undefined || objeto(serie) !== null) &&
    Array.isArray(c.repeticoes) &&
    c.repeticoes.every((r) => objeto(r) !== null)
  );
}

/* Recuperação de senha (spec 016) */

const FORMATO_SENHA_TEMPORARIA = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const STATUS_PEDIDO = new Set(['aberto', 'atendido']);

function lerPedido(valor: unknown): PedidoRecuperacao {
  const p = objeto(valor);
  if (
    !p ||
    typeof p.id !== 'number' ||
    !texto(p.email) ||
    !texto(p.pedidoEm) ||
    typeof p.status !== 'string' ||
    !STATUS_PEDIDO.has(p.status) ||
    (p.atendidoEm !== null && !texto(p.atendidoEm))
  ) {
    throw new RespostaInvalidaError();
  }
  return {
    id: p.id,
    email: p.email,
    pedidoEm: p.pedidoEm,
    status: p.status as PedidoRecuperacao['status'],
    atendidoEm: (p.atendidoEm as string | null) ?? null,
  };
}

/** `dados` com a lista de pedidos da caixa do administrador. */
export function lerPedidos(corpo: unknown): PedidoRecuperacao[] {
  const dados = objeto(corpo)?.dados;
  if (!Array.isArray(dados)) throw new RespostaInvalidaError();
  return dados.map(lerPedido);
}

/** `dados` com a senha gerada; recusa senha fora do formato XXXX-XXXX. */
export function lerSenhaTemporariaGerada(corpo: unknown): SenhaTemporariaGerada {
  const d = objeto(objeto(corpo)?.dados);
  if (
    !d ||
    typeof d.pedidoId !== 'number' ||
    !texto(d.email) ||
    typeof d.senhaTemporaria !== 'string' ||
    !FORMATO_SENHA_TEMPORARIA.test(d.senhaTemporaria) ||
    !texto(d.validaAte)
  ) {
    throw new RespostaInvalidaError();
  }
  return {
    pedidoId: d.pedidoId,
    email: d.email,
    senhaTemporaria: d.senhaTemporaria,
    validaAte: d.validaAte,
  };
}
