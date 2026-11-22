import { aplicarMigracoes } from '@/database/migracoes';
import {
  atualizarPaciente,
  buscarPaciente,
  inserirPaciente,
  listarPacientes,
} from '@/database/pacientes';
import type { DadosPaciente } from '@/types/patient';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const ana: DadosPaciente = {
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
      const salvo = await inserirPaciente(db, ana);

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

  describe('listarPacientes', () => {
    it('ordena por nome sem diferenciar maiúsculas', async () => {
      await inserirPaciente(db, dados('carla'));
      await inserirPaciente(db, dados('Bruno'));
      await inserirPaciente(db, dados('ana'));

      const nomes = (await listarPacientes(db)).map((p) => p.nome);
      expect(nomes).toEqual(['ana', 'Bruno', 'carla']);
    });

    it('devolve lista vazia sem pacientes', async () => {
      expect(await listarPacientes(db)).toEqual([]);
    });
  });

  describe('atualizarPaciente', () => {
    it('mantém id e criadoEm e atualiza os dados e o atualizadoEm', async () => {
      const original = await inserirPaciente(db, ana);
      await new Promise((resolver) => setTimeout(resolver, 5));

      const atualizado = await atualizarPaciente(db, original.id, {
        ...ana,
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
      await expect(atualizarPaciente(db, 'nao-existe', ana)).rejects.toThrow(
        'Paciente não encontrado.',
      );
    });
  });
});
