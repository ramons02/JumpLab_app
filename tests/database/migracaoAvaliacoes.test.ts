import { aplicarMigracoes, VERSAO_ATUAL } from '@/database/migracoes';
import { inserirPaciente } from '@/database/pacientes';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

const TABELAS = ['avaliacao', 'tentativa', 'serie_agachamento', 'repeticao'];
const CARIMBO = '2026-11-22T12:00:00.000Z';

const INSERIR_AVALIACAO = `INSERT INTO avaliacao
  (id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg, observacoes, resultado_json,
   criado_em, atualizado_em, pendente_sync)
  VALUES (?, ?, ?, ?, ?, ?, '', '{}', ?, ?, 1)`;

const INSERIR_TENTATIVA = `INSERT INTO tentativa
  (avaliacao_id, perna, numero, fps, quadro_toque, quadro_decolagem, quadro_aterrissagem)
  VALUES (?, ?, ?, ?, ?, ?, ?)`;

async function versao(db: BancoDeTeste) {
  return (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version;
}

async function contar(db: BancoDeTeste, tabela: string) {
  // Nome da tabela vem da constante TABELAS do próprio teste, nunca de fora.
  const linha = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${tabela}`,
  );
  return linha?.total;
}

describe('migração avaliacoes (D17)', () => {
  let db: BancoDeTeste;
  let pacienteId: string;

  beforeEach(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
    const paciente = await inserirPaciente(db, {
      nome: 'Ana Souza',
      dataNascimento: '1995-03-15',
      perfil: 'pos_lca',
      pernaLesionada: 'direita',
      dataLesao: '2026-08-10',
    });
    pacienteId = paciente.id;
  });

  afterEach(() => db.fechar());

  function avaliacao(id: string, protocolo: string, cargaKg: number | null, paciente = pacienteId) {
    return db.runAsync(
      INSERIR_AVALIACAO,
      id,
      paciente,
      protocolo,
      '2026-11-22T10:00',
      'direita',
      cargaKg,
      CARIMBO,
      CARIMBO,
    );
  }

  it('banco novo chega às quatro tabelas, vazias', async () => {
    expect(await versao(db)).toBe(VERSAO_ATUAL);
    for (const tabela of TABELAS) expect(await contar(db, tabela)).toBe(0);
  });

  it('banco que já estava na migração 1 também chega à atual, sem perder pacientes', async () => {
    const antigo = criarBancoEmMemoria();
    await antigo.runAsync(`CREATE TABLE paciente (
      id TEXT PRIMARY KEY NOT NULL, nome TEXT NOT NULL, data_nascimento TEXT NOT NULL,
      perfil TEXT NOT NULL, perna_lesionada TEXT NOT NULL, data_lesao TEXT,
      criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)`);
    await antigo.runAsync(
      "INSERT INTO paciente VALUES ('p1', 'Ana', '1995-03-15', 'corredor', 'nenhuma', NULL, 'x', 'x')",
    );
    await antigo.runAsync('PRAGMA user_version = 1');

    await aplicarMigracoes(antigo);

    expect(await versao(antigo)).toBe(VERSAO_ATUAL);
    expect(await contar(antigo, 'paciente')).toBe(1);
    for (const tabela of TABELAS) expect(await contar(antigo, tabela)).toBe(0);
    antigo.fechar();
  });

  it('rodar duas vezes não muda nada', async () => {
    await avaliacao('a1', 'cmj_bi', null);
    await aplicarMigracoes(db);
    expect(await versao(db)).toBe(VERSAO_ATUAL);
    expect(await contar(db, 'avaliacao')).toBe(1);
  });

  it('cria o índice por paciente e data', async () => {
    const indice = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_avaliacao_paciente_data'",
    );
    expect(indice?.name).toBe('idx_avaliacao_paciente_data');
  });

  it('recusa protocolo desconhecido', async () => {
    await expect(avaliacao('a1', 'salto_mortal', null)).rejects.toThrow(/CHECK/);
  });

  it('recusa carga em salto e agachamento sem carga', async () => {
    await expect(avaliacao('a1', 'cmj_bi', 20)).rejects.toThrow(/CHECK/);
    await expect(avaliacao('a2', 'agach', null)).rejects.toThrow(/CHECK/);
    await expect(avaliacao('a3', 'agach', 0)).rejects.toThrow(/CHECK/);
    await expect(avaliacao('a4', 'agach', 60)).resolves.toBeDefined();
  });

  it('recusa paciente inexistente pela chave estrangeira', async () => {
    await expect(avaliacao('a1', 'cmj_bi', null, 'nao-existe')).rejects.toThrow(/FOREIGN KEY/);
  });

  describe('tentativa', () => {
    beforeEach(async () => {
      await avaliacao('a1', 'dj', null);
    });

    it('aceita uma tentativa válida', async () => {
      await expect(
        db.runAsync(INSERIR_TENTATIVA, 'a1', 'unica', 1, 240, 100, 150, 250),
      ).resolves.toBeDefined();
    });

    it('recusa número 4, fps 30, aterrissagem igual à decolagem e toque depois da decolagem', async () => {
      await expect(
        db.runAsync(INSERIR_TENTATIVA, 'a1', 'unica', 4, 240, null, 150, 250),
      ).rejects.toThrow(/CHECK/);
      await expect(
        db.runAsync(INSERIR_TENTATIVA, 'a1', 'unica', 1, 30, null, 150, 250),
      ).rejects.toThrow(/CHECK/);
      await expect(
        db.runAsync(INSERIR_TENTATIVA, 'a1', 'unica', 2, 240, null, 150, 150),
      ).rejects.toThrow(/CHECK/);
      await expect(
        db.runAsync(INSERIR_TENTATIVA, 'a1', 'unica', 3, 240, 160, 150, 250),
      ).rejects.toThrow(/CHECK/);
    });

    it('recusa perna fora das opções', async () => {
      await expect(
        db.runAsync(INSERIR_TENTATIVA, 'a1', 'ambas', 1, 240, null, 150, 250),
      ).rejects.toThrow(/CHECK/);
    });
  });

  it('nenhuma coluna guarda vídeo (D14)', async () => {
    for (const tabela of TABELAS) {
      const colunas = await db.getAllAsync<{ name: string }>(
        'SELECT name FROM pragma_table_info(?)',
        tabela,
      );
      expect(colunas.length).toBeGreaterThan(0);
      for (const coluna of colunas) expect(coluna.name).not.toMatch(/video/i);
    }
  });
});
