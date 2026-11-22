import { aplicarMigracoes, VERSAO_ATUAL } from '@/database/migracoes';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

async function colunas(db: BancoDeTeste) {
  const linhas = await db.getAllAsync<{ name: string }>('PRAGMA table_info(avaliador)');
  return linhas.map((l) => l.name);
}

describe('migração avaliador (spec 010)', () => {
  let db: BancoDeTeste;

  beforeEach(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
  });

  afterEach(() => db.fechar());

  it('cria a tabela com id, nome, registro e atualizado_em, sem coluna de logotipo', async () => {
    expect(await colunas(db)).toEqual(['id', 'nome', 'registro', 'atualizado_em']);
  });

  it('rodar de novo não muda nada', async () => {
    await aplicarMigracoes(db);
    const versao = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(versao?.user_version).toBe(VERSAO_ATUAL);
    expect(await colunas(db)).toHaveLength(4);
  });

  it('só aceita a linha de id 1', async () => {
    await expect(
      db.runAsync(
        "INSERT INTO avaliador (id, nome, registro, atualizado_em) VALUES (2, '', '', 'x')",
      ),
    ).rejects.toThrow();
  });
});
