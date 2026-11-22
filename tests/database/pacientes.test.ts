import { aplicarMigracoes } from '@/database/migracoes';
import {
  atualizarPaciente,
  buscarPaciente,
  inserirPaciente,
  listarPacientesComUltimaAvaliacao,
} from '@/database/pacientes';
import type { DadosPaciente } from '@/types/patient';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const anaSouza: DadosPaciente = {
  nome: '  Ana Souza  ',
  dataNascimento: '1995-03-15',
  perfil: 'pos_lca',
  pernaLesionada: 'direita',
  dataLesao: '2026-08-10',
};

function dados(nome: string): DadosPaciente {
  return {
    nome,
    dataNascimento: '1990-01-01',
    perfil: 'corredor',
    pernaLesionada: 'nenhuma',
    dataLesao: null,
  };
}

describe('repositório de pacientes', () => {
  let db: BancoDeTeste;

  beforeEach(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
  });

  afterEach(() => db.fechar());

  describe('inserirPaciente', () => {
    it('gera UUID e carimbos e grava o nome sem espaços nas pontas', async () => {
      const salvo = await inserirPaciente(db, anaSouza);

      expect(salvo.id).toMatch(UUID);
      expect(salvo.nome).toBe('Ana Souza');
      expect(salvo.criadoEm).toMatch(ISO_UTC);
      expect(salvo.atualizadoEm).toBe(salvo.criadoEm);
      expect(await buscarPaciente(db, salvo.id)).toEqual(salvo);
    });

    it('gera um id diferente para cada paciente, mesmo com o mesmo nome', async () => {
      const primeiro = await inserirPaciente(db, dados('Ana'));
      const segundo = await inserirPaciente(db, dados('Ana'));
      expect(primeiro.id).not.toBe(segundo.id);
    });
  });

  describe('buscarPaciente', () => {
    it('devolve null para id inexistente', async () => {
      expect(await buscarPaciente(db, 'nao-existe')).toBeNull();
    });
  });

  describe('listarPacientesComUltimaAvaliacao', () => {
    async function avaliar(pacienteId: string, id: string, dataHora: string) {
      await db.runAsync(
        `INSERT INTO avaliacao (id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg,
           observacoes, resultado_json, criado_em, atualizado_em, pendente_sync)
         VALUES (?, ?, 'cmj_bi', ?, 'nenhuma', NULL, '', '{}', ?, ?, 1)`,
        id,
        pacienteId,
        dataHora,
        '2026-11-22T12:00:00.000Z',
        '2026-11-22T12:00:00.000Z',
      );
    }

    it('sem avaliações, todo paciente vem com ultimaAvaliacaoEm nulo', async () => {
      await inserirPaciente(db, dados('Ana'));
      await inserirPaciente(db, dados('Bruno'));

      const lista = await listarPacientesComUltimaAvaliacao(db);

      expect(lista).toHaveLength(2);
      expect(lista.every((p) => p.ultimaAvaliacaoEm === null)).toBe(true);
    });

    it('traz a data da avaliação mais recente e cada paciente uma vez só', async () => {
      const ana = await inserirPaciente(db, dados('Ana'));
      const bruno = await inserirPaciente(db, dados('Bruno'));
      await avaliar(ana.id, 'a1', '2026-10-01T09:00');
      await avaliar(ana.id, 'a2', '2026-11-20T18:30');

      const lista = await listarPacientesComUltimaAvaliacao(db);

      expect(lista).toHaveLength(2);
      expect(lista.find((p) => p.id === ana.id)?.ultimaAvaliacaoEm).toBe('2026-11-20T18:30');
      expect(lista.find((p) => p.id === bruno.id)?.ultimaAvaliacaoEm).toBeNull();
    });

    it('devolve os campos do paciente', async () => {
      const ana = await inserirPaciente(db, anaSouza);
      const [item] = await listarPacientesComUltimaAvaliacao(db);
      expect(item).toEqual({ ...ana, ultimaAvaliacaoEm: null });
    });
  });

  describe('atualizarPaciente', () => {
    it('mantém id e criadoEm e atualiza os dados e o atualizadoEm', async () => {
      const original = await inserirPaciente(db, anaSouza);
      await new Promise((resolver) => setTimeout(resolver, 5));

      const atualizado = await atualizarPaciente(db, original.id, {
        ...anaSouza,
        nome: ' Ana Souza Lima ',
        pernaLesionada: 'esquerda',
      });

      expect(atualizado.id).toBe(original.id);
      expect(atualizado.criadoEm).toBe(original.criadoEm);
      expect(atualizado.atualizadoEm > original.atualizadoEm).toBe(true);
      expect(atualizado.nome).toBe('Ana Souza Lima');
      expect(await buscarPaciente(db, original.id)).toEqual(atualizado);
    });

    it('falha com id inexistente', async () => {
      await expect(atualizarPaciente(db, 'nao-existe', anaSouza)).rejects.toThrow(
        'Paciente não encontrado.',
      );
    });
  });
});
