import { aplicarMigracoes, VERSAO_ATUAL } from '@/database/migracoes';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

const CARIMBO = '2026-11-22T12:00:00.000Z';

async function versao(db: BancoDeTeste) {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return linha?.user_version;
}

async function colunasDaTentativa(db: BancoDeTeste) {
  const linhas = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tentativa)');
  return linhas.map((l) => l.name);
}

async function inserirTentativaAntiga(db: BancoDeTeste) {
  await db.runAsync(
    `INSERT INTO paciente (id, nome, data_nascimento, perfil, perna_lesionada, data_lesao, criado_em,
       atualizado_em) VALUES ('p1', 'Ana', '1995-03-15', 'corredor', 'nenhuma', NULL, ?, ?)`,
    CARIMBO,
    CARIMBO,
  );
  await db.runAsync(
    `INSERT INTO avaliacao (id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg,
       observacoes, resultado_json, criado_em, atualizado_em, pendente_sync)
       VALUES ('a1', 'p1', 'cmj_bi', '2026-11-22T10:30', 'nenhuma', NULL, '', '{}', ?, ?, 1)`,
    CARIMBO,
    CARIMBO,
  );
  await db.runAsync(
    `INSERT INTO tentativa (avaliacao_id, perna, numero, fps, quadro_toque, quadro_decolagem,
       quadro_aterrissagem) VALUES ('a1', 'unica', 1, 240, NULL, 1000, 1120)`,
  );
}

describe('migração 6: sugestão automática (spec 018)', () => {
  let db: BancoDeTeste;

  beforeEach(() => {
    db = criarBancoEmMemoria();
  });

  afterEach(() => db.fechar());

  it('banco novo chega à versão 6 com as colunas e a tabela preferencia', async () => {
    await aplicarMigracoes(db);
    expect(VERSAO_ATUAL).toBe(6);
    expect(await versao(db)).toBe(6);
    expect(await colunasDaTentativa(db)).toEqual(
      expect.arrayContaining([
        'quadro_sugerido_toque',
        'quadro_sugerido_decolagem',
        'quadro_sugerido_aterrissagem',
      ]),
    );
    const preferencia = await db.getAllAsync<{ name: string }>('PRAGMA table_info(preferencia)');
    expect(preferencia.map((c) => c.name)).toEqual(['chave', 'valor']);
  });

  it('banco na versão 5 chega à 6 e as tentativas antigas ficam com o sugerido nulo', async () => {
    await aplicarMigracoes(db, 5);
    await inserirTentativaAntiga(db);
    await aplicarMigracoes(db);

    expect(await versao(db)).toBe(6);
    const linha = await db.getFirstAsync<Record<string, number | null>>(
      `SELECT quadro_decolagem, quadro_sugerido_toque, quadro_sugerido_decolagem,
              quadro_sugerido_aterrissagem FROM tentativa`,
    );
    expect(linha).toEqual({
      quadro_decolagem: 1000,
      quadro_sugerido_toque: null,
      quadro_sugerido_decolagem: null,
      quadro_sugerido_aterrissagem: null,
    });
  });

  it('preferencia recusa chave repetida', async () => {
    await aplicarMigracoes(db);
    await db.runAsync("INSERT INTO preferencia (chave, valor) VALUES ('sugestao_automatica', '1')");
    await expect(
      db.runAsync("INSERT INTO preferencia (chave, valor) VALUES ('sugestao_automatica', '0')"),
    ).rejects.toThrow();
  });

  it('rodar duas vezes não muda nada', async () => {
    await aplicarMigracoes(db);
    const antes = await colunasDaTentativa(db);
    await aplicarMigracoes(db);
    expect(await versao(db)).toBe(6);
    expect(await colunasDaTentativa(db)).toEqual(antes);
  });
});
