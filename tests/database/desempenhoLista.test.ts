import { aplicarMigracoes } from '@/database/migracoes';
import { inserirPaciente, listarPacientesComUltimaAvaliacao } from '@/database/pacientes';
import { filtrarPacientes } from '@/utils/filtroPacientes';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

// Metas da spec 002: lista em menos de 1 s (SC-001) e filtro em menos de 100 ms por letra (SC-002).
const TOTAL_PACIENTES = 500;
const AVALIACOES_POR_PACIENTE = 4;
const LIMITE_LISTAR_MS = 1000;
const LIMITE_FILTRAR_MS = 100;

describe('desempenho da lista com 500 pacientes e 2.000 avaliações', () => {
  let db: BancoDeTeste;

  beforeAll(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
    for (let i = 0; i < TOTAL_PACIENTES; i++) {
      const paciente = await inserirPaciente(db, {
        nome: `Paciente ${String(i).padStart(3, '0')}`,
        dataNascimento: '1990-01-01',
        perfil: i % 2 === 0 ? 'corredor' : 'pos_lca',
        pernaLesionada: i % 2 === 0 ? 'nenhuma' : 'direita',
        dataLesao: i % 2 === 0 ? null : '2026-01-10',
      });
      for (let a = 1; a <= AVALIACOES_POR_PACIENTE; a++) {
        await db.runAsync(
          `INSERT INTO avaliacao (id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg,
             observacoes, resultado_json, criado_em, atualizado_em, pendente_sync)
           VALUES (?, ?, 'cmj_bi', ?, 'nenhuma', NULL, '', '{}', 'x', 'x', 1)`,
          `${paciente.id}-${a}`,
          paciente.id,
          `2026-0${a}-10T10:00`,
        );
      }
    }
  });

  afterAll(() => db.fechar());

  it('lista em menos de 1 s', async () => {
    const inicio = performance.now();
    const lista = await listarPacientesComUltimaAvaliacao(db);
    expect(performance.now() - inicio).toBeLessThan(LIMITE_LISTAR_MS);
    expect(lista).toHaveLength(TOTAL_PACIENTES);
    expect(lista[0].ultimaAvaliacaoEm).toBe(`2026-0${AVALIACOES_POR_PACIENTE}-10T10:00`);
  });

  it('filtra 500 itens em menos de 100 ms', async () => {
    const lista = await listarPacientesComUltimaAvaliacao(db);
    const inicio = performance.now();
    const resultado = filtrarPacientes(lista, 'pos_lca', 'paciente 1');
    expect(performance.now() - inicio).toBeLessThan(LIMITE_FILTRAR_MS);
    expect(resultado.length).toBeGreaterThan(0);
  });
});
