import { aplicarMigracoes } from '@/database/migracoes';
import { inserirPaciente } from '@/database/pacientes';

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
    // Volta o banco para antes da migração melhorias (a 3), desfazendo ela e as seguintes,
    // grava uma avaliação e então migra de novo.
    await db.runAsync(`PRAGMA user_version = 0`);
    await aplicarMigracoes(db);
    await db.runAsync('DROP TABLE avaliador');
    await db.runAsync('ALTER TABLE avaliacao DROP COLUMN melhorias_json');
    await db.runAsync(`PRAGMA user_version = ${VERSAO_ANTES_DE_MELHORIAS}`);
    const paciente = await inserirPaciente(db, {
      nome: 'Ana Souza',
      dataNascimento: '1995-03-15',
      perfil: 'pos_lca',
      pernaLesionada: 'direita',
      dataLesao: '2026-05-20',
    });
    await db.runAsync(
      `INSERT INTO avaliacao (id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg,
         observacoes, resultado_json, criado_em, atualizado_em, pendente_sync)
       VALUES ('a1', ?, 'cmj_bi', '2026-11-01T09:00', 'direita', NULL, '', '{}', 'x', 'x', 1)`,
      paciente.id,
    );

    await aplicarMigracoes(db);

    expect(
      await db.getFirstAsync('SELECT melhorias_json FROM avaliacao WHERE id = ?', 'a1'),
    ).toEqual({ melhorias_json: null });
  });
});
