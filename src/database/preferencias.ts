import type { ConexaoBanco } from '@/database/conexao';

/** Chave da sugestão automática em teste (spec 018, RN15): `'1'` ligada; `'0'` ou ausente, desligada. */
export const CHAVE_SUGESTAO_AUTOMATICA = 'sugestao_automatica';

/** Preferência do aparelho; `null` se nunca foi gravada. Fica fora da sincronização. */
export async function lerPreferencia(db: ConexaoBanco, chave: string): Promise<string | null> {
  const linha = await db.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM preferencia WHERE chave = ?',
    chave,
  );
  return linha?.valor ?? null;
}

/** Grava a preferência, substituindo o valor anterior. */
export async function gravarPreferencia(
  db: ConexaoBanco,
  chave: string,
  valor: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO preferencia (chave, valor) VALUES (?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
    chave,
    valor,
  );
}
