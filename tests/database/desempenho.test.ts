import { aplicarMigracoes } from '@/database/migracoes';
import { inserirPaciente, listarPacientesComUltimaAvaliacao } from '@/database/pacientes';
import type { DadosPaciente } from '@/types/patient';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

// Metas do plan.md: lista em menos de 500 ms com 500 pacientes; salvar em menos de 1 s.
const TOTAL_PACIENTES = 500;
const LIMITE_LISTAR_MS = 500;
const LIMITE_SALVAR_MS = 1000;

function dados(indice: number): DadosPaciente {
  return {
    nome: `Paciente ${String(indice).padStart(3, '0')}`,
    dataNascimento: '1990-01-01',
    perfil: indice % 2 === 0 ? 'corredor' : 'pos_lca',
    pernaLesionada: indice % 2 === 0 ? 'nenhuma' : 'direita',
    dataLesao: indice % 2 === 0 ? null : '2026-01-10',
  };
}

describe('desempenho do banco com 500 pacientes', () => {
  let db: BancoDeTeste;

  beforeAll(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
    for (let i = 0; i < TOTAL_PACIENTES; i++) await inserirPaciente(db, dados(i));
  });

  afterAll(() => db.fechar());

  it('lista em menos de 500 ms', async () => {
    const inicio = performance.now();
    const lista = await listarPacientesComUltimaAvaliacao(db);
    expect(performance.now() - inicio).toBeLessThan(LIMITE_LISTAR_MS);
    expect(lista).toHaveLength(TOTAL_PACIENTES);
  });

  it('salva em menos de 1 s', async () => {
    const inicio = performance.now();
    await inserirPaciente(db, dados(TOTAL_PACIENTES));
    expect(performance.now() - inicio).toBeLessThan(LIMITE_SALVAR_MS);
  });
});
