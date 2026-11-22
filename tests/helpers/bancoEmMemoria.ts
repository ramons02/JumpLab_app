import Database from 'better-sqlite3';

import type { ConexaoBanco, ParametroSql } from '@/database/conexao';

export interface BancoDeTeste extends ConexaoBanco {
  fechar(): void;
}

/** SQLite real em memória com a mesma interface que o app usa do expo-sqlite. */
export function criarBancoEmMemoria(): BancoDeTeste {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  return {
    async runAsync(sql: string, ...params: ParametroSql[]) {
      const comando = db.prepare(sql);
      return comando.reader ? comando.all(...params) : comando.run(...params);
    },
    async getAllAsync<T>(sql: string, ...params: ParametroSql[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, ...params: ParametroSql[]) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(tarefa: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await tarefa();
        db.exec('COMMIT');
      } catch (erro) {
        db.exec('ROLLBACK');
        throw erro;
      }
    },
    fechar() {
      db.close();
    },
  };
}
