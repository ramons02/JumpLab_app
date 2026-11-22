import Database from 'better-sqlite3';

import type { ConexaoBanco, ParametroSql } from '@/database/conexao';

export interface BancoDeTeste extends ConexaoBanco {
  fechar(): void;
}

/**
 * O better-sqlite3 é nativo e carregado uma vez por processo: a classe de erro dele fica presa ao
 * primeiro arquivo de teste, e nos seguintes o erro não é `instanceof Error`. Relançar como `Error`
 * do contexto atual mantém o `toThrow` confiável em qualquer ordem de execução.
 */
function executar<T>(operacao: () => T): T {
  try {
    return operacao();
  } catch (erro) {
    const temMensagem = typeof erro === 'object' && erro !== null && 'message' in erro;
    throw new Error(temMensagem ? String(erro.message) : String(erro));
  }
}

/** SQLite real em memória com a mesma interface que o app usa do expo-sqlite. */
export function criarBancoEmMemoria(): BancoDeTeste {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  return {
    async runAsync(sql: string, ...params: ParametroSql[]) {
      return executar(() => {
        const comando = db.prepare(sql);
        return comando.reader ? comando.all(...params) : comando.run(...params);
      });
    },
    async getAllAsync<T>(sql: string, ...params: ParametroSql[]) {
      return executar(() => db.prepare(sql).all(...params) as T[]);
    },
    async getFirstAsync<T>(sql: string, ...params: ParametroSql[]) {
      return executar(() => (db.prepare(sql).get(...params) as T | undefined) ?? null);
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
