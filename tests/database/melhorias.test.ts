import { aplicarMigracoes } from '@/database/migracoes';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

/** Versão do esquema logo antes da migração melhorias (a 3); a avaliador (4) vem depois. */
const VERSAO_ANTES_DE_MELHORIAS = 2;

describe('migração melhorias (spec 017)', () => {
  let db: BancoDeTeste;

  beforeEach(() => {
    db = criarBancoEmMemoria();
  });

  afterEach(() => db.fechar());

  it('acrescenta melhorias_json em avaliacao, aceitando nulo', async () => {
    await aplicarMigracoes(db);
    const colunas = await db.getAllAsync<{ name: string; notnull: number }>(
      'SELECT name, "notnull" FROM pragma_table_info(\'avaliacao\')',
    );
    expect(colunas).toContainEqual({ name: 'melhorias_json', notnull: 0 });
  });

  it('linhas gravadas antes da migração ficam com melhorias_json nulo', async () => {
    // Banco parado logo antes da migração melhorias (a 3): grava uma avaliação e então migra.
    await aplicarMigracoes(db, VERSAO_ANTES_DE_MELHORIAS);
    await db.runAsync(
      `INSERT INTO paciente (id, nome, data_nascimento, perfil, perna_lesionada, data_lesao, criado_em, atualizado_em)
       VALUES ('p1', 'Ana Souza', '1995-03-15', 'pos_lca', 'direita', '2026-05-20', 'x', 'x')`,
    );
    await db.runAsync(
      `INSERT INTO avaliacao (id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg,
         observacoes, resultado_json, criado_em, atualizado_em, pendente_sync)
       VALUES ('a1', 'p1', 'cmj_bi', '2026-11-01T09:00', 'direita', NULL, '', '{}', 'x', 'x', 1)`,
    );

    await aplicarMigracoes(db);

    expect(
      await db.getFirstAsync('SELECT melhorias_json FROM avaliacao WHERE id = ?', 'a1'),
    ).toEqual({ melhorias_json: null });
  });
});
