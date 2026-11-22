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

  describe('migração sincronizacao (spec 013)', () => {
    /** Versão logo antes da migração sincronizacao (a 5). */
    const ANTES_DA_SINCRONIZACAO = 4;

    it('estado_sync nasce com a linha 1 e cursor 0', async () => {
      await aplicarMigracoes(db);
      expect(await versao(db)).toBe(VERSAO_ATUAL);
      expect(await db.getFirstAsync('SELECT * FROM estado_sync')).toEqual({
        id: 1,
        usuario_email: null,
        cursor_servidor: 0,
        ultima_sincronizacao: null,
        ultimo_resultado: null,
        ultimo_erro: null,
      });
    });

    it('pacientes gravados antes da migração ficam pendentes', async () => {
      await aplicarMigracoes(db, ANTES_DA_SINCRONIZACAO);
      await db.runAsync(
        INSERIR,
        'p1',
        'Ana',
        '1995-03-15',
        'corredor',
        'nenhuma',
        null,
        CARIMBO,
        CARIMBO,
      );

      await aplicarMigracoes(db);

      expect(await db.getFirstAsync('SELECT pendente_sync FROM paciente')).toEqual({
        pendente_sync: 1,
      });
    });

    it('CHECK recusa pendente_sync 2 e rodar de novo não muda nada', async () => {
      await aplicarMigracoes(db);
      await expect(
        db.runAsync(
          `INSERT INTO paciente (id, nome, data_nascimento, perfil, perna_lesionada, data_lesao, criado_em, atualizado_em, pendente_sync)
           VALUES ('p2', 'Ana', '1995-03-15', 'corredor', 'nenhuma', NULL, 'x', 'x', 2)`,
        ),
      ).rejects.toThrow();
      await aplicarMigracoes(db);
      expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM estado_sync')).toEqual({ n: 1 });
    });
  });
});
