export type ParametroSql = string | number | null;

/**
 * Subconjunto do `SQLiteDatabase` do expo-sqlite usado pelo app. As funções de `src/database/`
 * recebem esta interface para poderem ser testadas contra SQLite real em memória no Jest.
 */
export interface ConexaoBanco {
  runAsync(sql: string, ...params: ParametroSql[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: ParametroSql[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: ParametroSql[]): Promise<T | null>;
  withTransactionAsync(tarefa: () => Promise<void>): Promise<void>;
}
