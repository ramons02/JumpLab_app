import type { ConexaoBanco } from '@/database/conexao';

/**
 * Migrações numeradas a partir de 1, aplicadas em ordem e controladas por `PRAGMA user_version`.
 * Migração aplicada nunca é editada: mudança nova vira um item novo no fim da lista.
 */
const MIGRACOES: readonly string[] = [
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
];

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
