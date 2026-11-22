import type { ConexaoBanco } from '@/database/conexao';

/**
 * Migrações numeradas a partir de 1, aplicadas em ordem e controladas por `PRAGMA user_version`.
 * Migração aplicada nunca é editada: mudança nova vira um item novo no fim da lista.
 */
const MIGRACOES: readonly string[] = [
  // 1. paciente (spec 001)
  `CREATE TABLE paciente (
     id TEXT PRIMARY KEY NOT NULL,
     nome TEXT NOT NULL,
     data_nascimento TEXT NOT NULL,
     perfil TEXT NOT NULL CHECK (perfil IN ('pos_lca', 'corredor')),
     perna_lesionada TEXT NOT NULL CHECK (perna_lesionada IN ('direita', 'esquerda', 'nenhuma')),
     data_lesao TEXT,
     criado_em TEXT NOT NULL,
     atualizado_em TEXT NOT NULL,
     CHECK (perfil <> 'pos_lca' OR (perna_lesionada <> 'nenhuma' AND data_lesao IS NOT NULL))
   );
   CREATE INDEX idx_paciente_nome ON paciente (nome COLLATE NOCASE);`,

  // 2. avaliacoes (D17): tabelas das avaliações, vazias até a spec 008 e a HU014. Sem vídeo (D14).
  `CREATE TABLE avaliacao (
     id TEXT PRIMARY KEY NOT NULL,
     paciente_id TEXT NOT NULL REFERENCES paciente (id),
     protocolo TEXT NOT NULL CHECK (protocolo IN ('cmj_bi', 'cmj_uni', 'sj', 'dj', 'dj_uni', 'agach')),
     data_hora TEXT NOT NULL,
     perna_lesionada TEXT NOT NULL CHECK (perna_lesionada IN ('direita', 'esquerda', 'nenhuma')),
     carga_kg REAL,
     observacoes TEXT NOT NULL,
     resultado_json TEXT NOT NULL,
     criado_em TEXT NOT NULL,
     atualizado_em TEXT NOT NULL,
     pendente_sync INTEGER NOT NULL CHECK (pendente_sync IN (0, 1)),
     -- IS NOT NULL explícito: no SQLite, um CHECK que resulta em NULL é aceito.
     CHECK ((protocolo = 'agach' AND carga_kg IS NOT NULL AND carga_kg > 0)
            OR (protocolo <> 'agach' AND carga_kg IS NULL))
   );
   CREATE INDEX idx_avaliacao_paciente_data ON avaliacao (paciente_id, data_hora);
   CREATE TABLE tentativa (
     avaliacao_id TEXT NOT NULL REFERENCES avaliacao (id) ON DELETE CASCADE,
     perna TEXT NOT NULL CHECK (perna IN ('unica', 'direita', 'esquerda')),
     numero INTEGER NOT NULL CHECK (numero BETWEEN 1 AND 3),
     fps REAL NOT NULL CHECK (fps >= 60),
     quadro_toque INTEGER,
     quadro_decolagem INTEGER NOT NULL,
     quadro_aterrissagem INTEGER NOT NULL,
     PRIMARY KEY (avaliacao_id, perna, numero),
     CHECK (quadro_toque IS NULL OR quadro_toque < quadro_decolagem),
     CHECK (quadro_decolagem < quadro_aterrissagem)
   );
   CREATE TABLE serie_agachamento (
     avaliacao_id TEXT PRIMARY KEY NOT NULL REFERENCES avaliacao (id) ON DELETE CASCADE,
     fps REAL NOT NULL CHECK (fps >= 60),
     calib_topo_y REAL NOT NULL,
     calib_base_y REAL NOT NULL,
     CHECK (calib_base_y <> calib_topo_y)
   );
   CREATE TABLE repeticao (
     avaliacao_id TEXT NOT NULL REFERENCES avaliacao (id) ON DELETE CASCADE,
     numero INTEGER NOT NULL CHECK (numero >= 1),
     inicio_quadro INTEGER NOT NULL,
     inicio_y REAL NOT NULL,
     fundo_quadro INTEGER NOT NULL,
     fundo_y REAL NOT NULL,
     fim_quadro INTEGER NOT NULL,
     fim_y REAL NOT NULL,
     PRIMARY KEY (avaliacao_id, numero),
     CHECK (inicio_quadro < fundo_quadro AND fundo_quadro < fim_quadro)
   );`,

  // 3. avaliador (spec 010): linha única com o cabeçalho do laudo, sem logotipo (HU010 RN08).
  `CREATE TABLE avaliador (
     id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
     nome TEXT NOT NULL,
     registro TEXT NOT NULL,
     atualizado_em TEXT NOT NULL
   );`,
];

/** Versão do esquema depois de todas as migrações. */
export const VERSAO_ATUAL = MIGRACOES.length;

export async function aplicarMigracoes(db: ConexaoBanco): Promise<void> {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const versaoAtual = linha?.user_version ?? 0;

  for (let versao = versaoAtual + 1; versao <= MIGRACOES.length; versao++) {
    const comandos = separarComandos(MIGRACOES[versao - 1]);
    await db.withTransactionAsync(async () => {
      for (const comando of comandos) await db.runAsync(comando);
      // PRAGMA não aceita parâmetro; `versao` é um inteiro do próprio laço, nunca vem de fora.
      await db.runAsync(`PRAGMA user_version = ${versao}`);
    });
  }
}

function separarComandos(migracao: string): string[] {
  return migracao
    .split(';')
    .map((comando) => comando.trim())
    .filter((comando) => comando.length > 0);
}
