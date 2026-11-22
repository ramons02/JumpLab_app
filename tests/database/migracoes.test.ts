import { aplicarMigracoes, VERSAO_ATUAL } from '@/database/migracoes';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

const INSERIR =
  'INSERT INTO paciente (id, nome, data_nascimento, perfil, perna_lesionada, data_lesao, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
const CARIMBO = '2026-11-22T12:00:00.000Z';

async function versao(db: BancoDeTeste) {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return linha?.user_version;
}

describe('aplicarMigracoes', () => {
  let db: BancoDeTeste;

  beforeEach(() => {
    db = criarBancoEmMemoria();
  });

  afterEach(() => db.fechar());

  it('leva um banco novo à versão atual com a tabela paciente e o índice por nome', async () => {
    await aplicarMigracoes(db);

    expect(await versao(db)).toBe(VERSAO_ATUAL);
    const tabela = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'paciente'",
    );
    expect(tabela?.name).toBe('paciente');
    const indice = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_paciente_nome'",
    );
    expect(indice?.name).toBe('idx_paciente_nome');
  });

  it('rodar duas vezes não muda nada nem perde dados', async () => {
    await aplicarMigracoes(db);
    await db.runAsync(
      INSERIR,
      'id-1',
      'Ana',
      '1995-03-15',
      'corredor',
      'nenhuma',
      null,
      CARIMBO,
      CARIMBO,
    );

    await aplicarMigracoes(db);

    expect(await versao(db)).toBe(VERSAO_ATUAL);
    const total = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM paciente',
    );
    expect(total?.total).toBe(1);
  });

  it('recusa Pós-LCA com perna Nenhuma', async () => {
    await aplicarMigracoes(db);
    await expect(
      db.runAsync(
        INSERIR,
        'id-1',
        'Ana',
        '1995-03-15',
        'pos_lca',
        'nenhuma',
        '2026-08-10',
        CARIMBO,
        CARIMBO,
      ),
    ).rejects.toThrow(/CHECK/);
  });

  it('recusa Pós-LCA sem data da cirurgia', async () => {
    await aplicarMigracoes(db);
    await expect(
      db.runAsync(
        INSERIR,
        'id-1',
        'Ana',
        '1995-03-15',
        'pos_lca',
        'direita',
        null,
        CARIMBO,
        CARIMBO,
      ),
    ).rejects.toThrow(/CHECK/);
  });

  it('recusa perfil e perna fora das opções', async () => {
    await aplicarMigracoes(db);
    await expect(
      db.runAsync(INSERIR, 'id-1', 'Ana', '1995-03-15', 'outro', 'nenhuma', null, CARIMBO, CARIMBO),
    ).rejects.toThrow(/CHECK/);
    await expect(
      db.runAsync(
        INSERIR,
        'id-2',
        'Ana',
        '1995-03-15',
        'corredor',
        'ambas',
        null,
        CARIMBO,
        CARIMBO,
      ),
    ).rejects.toThrow(/CHECK/);
  });
});
