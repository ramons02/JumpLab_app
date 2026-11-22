export type EstadoExibido =
  | { tipo: 'sem-sessao' }
  | { tipo: 'sincronizado' }
  | { tipo: 'pendente'; quantidade: number }
  | { tipo: 'sincronizando' }
  | { tipo: 'erro'; motivo: string; quantidadePendente: number };

export interface EstadoSync {
  /** Conta dona dos dados do aparelho; null até a primeira sincronização. */
  usuarioEmail: string | null;
  /** Maior versão recebida da API. */
  cursorServidor: number;
  /** Fim da última rodada sem erro (ISO 8601 UTC); null = "Nunca". */
  ultimaSincronizacao: string | null;
  ultimoResultado: 'ok' | 'erro' | null;
  ultimoErro: string | null;
}

export type TipoRegistro = 'paciente' | 'avaliacao';

export interface RegistroSync {
  tipo: TipoRegistro;
  /** UUID do aparelho */
  id: string;
  /** Só na avaliação */
  pacienteId?: string;
  /** ISO 8601 UTC */
  atualizadoEm: string;
  conteudo: Record<string, unknown>;
}

export type SituacaoEnvio = 'aceito' | 'ignorado' | 'recusado';

export interface ResultadoRegistro {
  tipo: TipoRegistro;
  id: string;
  situacao: SituacaoEnvio;
  motivo: string | null;
}

export interface PaginaRecebimento {
  pacientes: RegistroSync[];
  avaliacoes: RegistroSync[];
  cursor: number;
  temMais: boolean;
}
