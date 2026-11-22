import type { ConexaoBanco, ParametroSql } from '@/database/conexao';
import type { EstadoSync, RegistroSync, TipoRegistro } from '@/types/sincronizacao';
import { linhaParaConteudo } from '@/sync/serializacao';

/**
 * Banco do aparelho na sincronização (spec 013). Os nomes das tabelas e colunas são fixos daqui; o
 * conteúdo recebido da API entra só por estas listas e sempre por parâmetro (nunca concatenado).
 */
type Linha = Record<string, unknown>;

const COLUNAS_PACIENTE = [
  'id',
  'nome',
  'data_nascimento',
  'perfil',
  'perna_lesionada',
  'data_lesao',
  'criado_em',
  'atualizado_em',
] as const;
const COLUNAS_AVALIACAO = [
  'id',
  'paciente_id',
  'protocolo',
  'data_hora',
  'perna_lesionada',
  'carga_kg',
  'observacoes',
  'resultado_json',
  'criado_em',
  'atualizado_em',
  'melhorias_json',
] as const;
const COLUNAS_TENTATIVA = [
  'perna',
  'numero',
  'fps',
  'quadro_toque',
  'quadro_decolagem',
  'quadro_aterrissagem',
] as const;
const COLUNAS_SERIE = ['fps', 'calib_topo_y', 'calib_base_y'] as const;
const COLUNAS_REPETICAO = [
  'numero',
  'inicio_quadro',
  'inicio_y',
  'fundo_quadro',
  'fundo_y',
  'fim_quadro',
  'fim_y',
] as const;

const TABELA: Record<TipoRegistro, 'paciente' | 'avaliacao'> = {
  paciente: 'paciente',
  avaliacao: 'avaliacao',
};

function valor(linha: Linha, coluna: string): ParametroSql {
  const v = linha[coluna];
  return typeof v === 'string' || typeof v === 'number' ? v : null;
}

/* Envio */

export async function listarPacientesPendentes(
  db: ConexaoBanco,
  limite: number,
): Promise<RegistroSync[]> {
  const linhas = await db.getAllAsync<Linha>(
    'SELECT * FROM paciente WHERE pendente_sync = 1 ORDER BY atualizado_em, id LIMIT ?',
    limite,
  );
  return linhas.map((linha) => ({
    tipo: 'paciente',
    id: String(linha.id),
    atualizadoEm: String(linha.atualizado_em),
    conteudo: linhaParaConteudo(linha),
  }));
}

/** Avaliações pendentes com o agregado: avaliação, tentativas, série e repetições do agachamento. */
export async function listarAvaliacoesPendentes(
  db: ConexaoBanco,
  limite: number,
): Promise<RegistroSync[]> {
  const linhas = await db.getAllAsync<Linha>(
    'SELECT * FROM avaliacao WHERE pendente_sync = 1 ORDER BY atualizado_em, id LIMIT ?',
    limite,
  );
  const registros: RegistroSync[] = [];
  for (const avaliacao of linhas) {
    const id = String(avaliacao.id);
    const [tentativas, serie, repeticoes] = await Promise.all([
      db.getAllAsync<Linha>(
        'SELECT * FROM tentativa WHERE avaliacao_id = ? ORDER BY perna, numero',
        id,
      ),
      db.getFirstAsync<Linha>('SELECT * FROM serie_agachamento WHERE avaliacao_id = ?', id),
      db.getAllAsync<Linha>('SELECT * FROM repeticao WHERE avaliacao_id = ? ORDER BY numero', id),
    ]);
    registros.push({
      tipo: 'avaliacao',
      id,
      pacienteId: String(avaliacao.paciente_id),
      atualizadoEm: String(avaliacao.atualizado_em),
      conteudo: {
        avaliacao: linhaParaConteudo(avaliacao),
        tentativas,
        serieAgachamento: serie,
        repeticoes,
      },
    });
  }
  return registros;
}

/** Deixa de ser pendente só se não mudou depois do envio (research R4). */
export async function marcarSincronizado(
  db: ConexaoBanco,
  tipo: TipoRegistro,
  id: string,
  atualizadoEmEnviado: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE ${TABELA[tipo]} SET pendente_sync = 0 WHERE id = ? AND atualizado_em = ?`,
    id,
    atualizadoEmEnviado,
  );
}

export async function contarPendentes(db: ConexaoBanco): Promise<number> {
  const linha = await db.getFirstAsync<{ total: number }>(
    `SELECT (SELECT COUNT(*) FROM paciente WHERE pendente_sync = 1)
          + (SELECT COUNT(*) FROM avaliacao WHERE pendente_sync = 1) AS total`,
  );
  return linha?.total ?? 0;
}

/** Pacientes com algo ainda não enviado: o próprio cadastro ou alguma avaliação. */
export async function listarIdsPacientesPendentes(db: ConexaoBanco): Promise<Set<string>> {
  const linhas = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM paciente WHERE pendente_sync = 1
     UNION SELECT paciente_id FROM avaliacao WHERE pendente_sync = 1`,
  );
  return new Set(linhas.map((l) => l.id));
}

/* Recebimento */

async function localMaisNovoOuIgual(db: ConexaoBanco, tabela: string, registro: RegistroSync) {
  const local = await db.getFirstAsync<{ atualizado_em: string }>(
    `SELECT atualizado_em FROM ${tabela} WHERE id = ?`,
    registro.id,
  );
  return local !== null && Date.parse(local.atualizado_em) >= Date.parse(registro.atualizadoEm);
}

function upsert(tabela: string, colunas: readonly string[]): string {
  const atualizar = colunas.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`);
  return `INSERT INTO ${tabela} (${colunas.join(', ')}, pendente_sync)
          VALUES (${colunas.map(() => '?').join(', ')}, 0)
          ON CONFLICT (id) DO UPDATE SET ${atualizar.join(', ')}, pendente_sync = 0`;
}

function inserirFilha(tabela: string, colunas: readonly string[]): string {
  return `INSERT INTO ${tabela} (avaliacao_id, ${colunas.join(', ')})
          VALUES (?, ${colunas.map(() => '?').join(', ')})`;
}

/** Grava o paciente recebido se for mais novo que o local (D15), já como sincronizado. */
export async function aplicarPacienteRecebido(
  db: ConexaoBanco,
  registro: RegistroSync,
): Promise<'gravado' | 'mantido-local'> {
  if (await localMaisNovoOuIgual(db, 'paciente', registro)) return 'mantido-local';
  const c = registro.conteudo;
  await db.runAsync(
    upsert('paciente', COLUNAS_PACIENTE),
    ...COLUNAS_PACIENTE.map((col) => valor(c, col)),
  );
  return 'gravado';
}

/** Grava a avaliação recebida inteira numa transação, substituindo as filhas; mais nova vence (D15). */
export async function aplicarAvaliacaoRecebida(
  db: ConexaoBanco,
  registro: RegistroSync,
): Promise<'gravado' | 'mantido-local'> {
  if (await localMaisNovoOuIgual(db, 'avaliacao', registro)) return 'mantido-local';
  const conteudo = registro.conteudo;
  const avaliacao = conteudo.avaliacao as Linha;
  const tentativas = (conteudo.tentativas as Linha[] | undefined) ?? [];
  const serie = (conteudo.serieAgachamento as Linha | null | undefined) ?? null;
  const repeticoes = (conteudo.repeticoes as Linha[] | undefined) ?? [];
  const id = registro.id;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      upsert('avaliacao', COLUNAS_AVALIACAO),
      ...COLUNAS_AVALIACAO.map((col) => valor(avaliacao, col)),
    );
    await db.runAsync('DELETE FROM tentativa WHERE avaliacao_id = ?', id);
    await db.runAsync('DELETE FROM repeticao WHERE avaliacao_id = ?', id);
    await db.runAsync('DELETE FROM serie_agachamento WHERE avaliacao_id = ?', id);
    for (const t of tentativas) {
      await db.runAsync(
        inserirFilha('tentativa', COLUNAS_TENTATIVA),
        id,
        ...COLUNAS_TENTATIVA.map((col) => valor(t, col)),
      );
    }
    if (serie) {
      await db.runAsync(
        inserirFilha('serie_agachamento', COLUNAS_SERIE),
        id,
        ...COLUNAS_SERIE.map((col) => valor(serie, col)),
      );
    }
    for (const r of repeticoes) {
      await db.runAsync(
        inserirFilha('repeticao', COLUNAS_REPETICAO),
        id,
        ...COLUNAS_REPETICAO.map((col) => valor(r, col)),
      );
    }
  });
  return 'gravado';
}

/* Estado */

interface LinhaEstado {
  usuario_email: string | null;
  cursor_servidor: number;
  ultima_sincronizacao: string | null;
  ultimo_resultado: 'ok' | 'erro' | null;
  ultimo_erro: string | null;
}

const COLUNA_DO_ESTADO: Record<keyof EstadoSync, keyof LinhaEstado> = {
  usuarioEmail: 'usuario_email',
  cursorServidor: 'cursor_servidor',
  ultimaSincronizacao: 'ultima_sincronizacao',
  ultimoResultado: 'ultimo_resultado',
  ultimoErro: 'ultimo_erro',
};

export async function lerEstadoSync(db: ConexaoBanco): Promise<EstadoSync> {
  const linha = await db.getFirstAsync<LinhaEstado>(
    'SELECT usuario_email, cursor_servidor, ultima_sincronizacao, ultimo_resultado, ultimo_erro FROM estado_sync WHERE id = 1',
  );
  return {
    usuarioEmail: linha?.usuario_email ?? null,
    cursorServidor: linha?.cursor_servidor ?? 0,
    ultimaSincronizacao: linha?.ultima_sincronizacao ?? null,
    ultimoResultado: linha?.ultimo_resultado ?? null,
    ultimoErro: linha?.ultimo_erro ?? null,
  };
}

export async function gravarEstadoSync(
  db: ConexaoBanco,
  alteracao: Partial<EstadoSync>,
): Promise<void> {
  const campos = (Object.keys(alteracao) as (keyof EstadoSync)[]).filter(
    (k) => k in COLUNA_DO_ESTADO,
  );
  if (campos.length === 0) return;
  await db.runAsync(
    `UPDATE estado_sync SET ${campos.map((k) => `${COLUNA_DO_ESTADO[k]} = ?`).join(', ')} WHERE id = 1`,
    ...campos.map((k) => (alteracao[k] ?? null) as ParametroSql),
  );
}
