import { salvarAvaliacao } from '@/database/avaliacoes';
import { aplicarMigracoes } from '@/database/migracoes';
import { atualizarPaciente, buscarPaciente, inserirPaciente } from '@/database/pacientes';
import {
  aplicarAvaliacaoRecebida,
  aplicarPacienteRecebido,
  contarPendentes,
  gravarEstadoSync,
  lerEstadoSync,
  listarAvaliacoesPendentes,
  listarIdsPacientesPendentes,
  listarPacientesPendentes,
  marcarSincronizado,
} from '@/database/sincronizacao';
import type { Patient } from '@/types/patient';
import type { RegistroSync } from '@/types/sincronizacao';
import { montarResumoAgachamento, montarResumoSalto } from '@/utils/resumoAvaliacao';

import { CMJ_BILATERAL, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';
import { SERIE_CA02 } from '../helpers/serieDeTeste';

const ANA = {
  nome: 'Ana Souza',
  dataNascimento: '1995-03-15',
  perfil: 'pos_lca' as const,
  pernaLesionada: 'direita' as const,
  dataLesao: '2026-05-20',
};

describe('banco da sincronização', () => {
  let db: BancoDeTeste;
  let ana: Patient;

  beforeEach(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
    ana = await inserirPaciente(db, ANA);
  });

  afterEach(() => db.fechar());

  async function salvarCmj(dataHora = '2026-11-22T10:30') {
    const nova = novaAvaliacao(ana.id, 'cmj_bi', CMJ_BILATERAL, { dataHora });
    return salvarAvaliacao(db, nova, montarResumoSalto(nova), 'Obs');
  }

  describe('envio', () => {
    it('paciente pendente sai sem pendente_sync e respeita o limite', async () => {
      await inserirPaciente(db, { ...ANA, nome: 'Bruno' });
      const [primeiro, ...resto] = await listarPacientesPendentes(db, 1);
      expect(resto).toEqual([]);
      expect(primeiro).toMatchObject({ tipo: 'paciente', id: expect.any(String) });
      expect(primeiro.conteudo).not.toHaveProperty('pendente_sync');
      expect(primeiro.conteudo).toHaveProperty('data_nascimento');
      expect(await listarPacientesPendentes(db, 10)).toHaveLength(2);
    });

    it('avaliação pendente sai com o agregado inteiro', async () => {
      const salva = await salvarCmj();
      const [registro] = await listarAvaliacoesPendentes(db, 10);
      expect(registro).toMatchObject({
        tipo: 'avaliacao',
        id: salva.id,
        pacienteId: ana.id,
        atualizadoEm: salva.atualizadoEm,
      });
      const conteudo = registro.conteudo as {
        avaliacao: Record<string, unknown>;
        tentativas: unknown[];
        serieAgachamento: unknown;
        repeticoes: unknown[];
      };
      expect(conteudo.avaliacao).not.toHaveProperty('pendente_sync');
      expect(conteudo.avaliacao.observacoes).toBe('Obs');
      expect(conteudo.tentativas).toHaveLength(3);
      expect(conteudo.serieAgachamento).toBeNull();
      expect(conteudo.repeticoes).toEqual([]);
    });

    it('agachamento leva a série e as repetições', async () => {
      const nova = novaAvaliacao(ana.id, 'agach', [], { cargaKg: 60, serie: SERIE_CA02 });
      await salvarAvaliacao(db, nova, montarResumoAgachamento(nova), '');
      const [registro] = await listarAvaliacoesPendentes(db, 10);
      expect(registro.conteudo.serieAgachamento).toMatchObject({ fps: 60, calib_topo_y: 100 });
      expect(registro.conteudo.repeticoes).toHaveLength(3);
    });

    it('marcarSincronizado zera só se atualizado_em ainda for o enviado', async () => {
      const [enviado] = await listarPacientesPendentes(db, 10);
      await marcarSincronizado(db, 'paciente', enviado.id, enviado.atualizadoEm);
      expect(await listarPacientesPendentes(db, 10)).toEqual([]);

      const [deNovo] = [enviado];
      // A edição acontece depois do envio (relógio adiantado: no mesmo milissegundo não muda nada).
      jest.useFakeTimers({
        now: Date.parse(enviado.atualizadoEm) + 1000,
        doNotFake: ['nextTick', 'setImmediate'],
      });
      await atualizarPaciente(db, ana.id, { ...ANA, nome: 'Ana Lima' });
      jest.useRealTimers();
      await marcarSincronizado(db, 'paciente', deNovo.id, deNovo.atualizadoEm);
      expect(await listarPacientesPendentes(db, 10)).toHaveLength(1);
    });

    it('contarPendentes e os pacientes com algo pendente', async () => {
      const salva = await salvarCmj();
      expect(await contarPendentes(db)).toBe(2);
      const [p] = await listarPacientesPendentes(db, 1);
      await marcarSincronizado(db, 'paciente', p.id, p.atualizadoEm);
      expect(await contarPendentes(db)).toBe(1);
      expect(await listarIdsPacientesPendentes(db)).toEqual(new Set([ana.id]));
      await marcarSincronizado(db, 'avaliacao', salva.id, salva.atualizadoEm);
      expect(await listarIdsPacientesPendentes(db)).toEqual(new Set());
    });
  });

  describe('recebimento', () => {
    function pacienteRecebido(id: string, nome: string, atualizadoEm: string): RegistroSync {
      return {
        tipo: 'paciente',
        id,
        atualizadoEm,
        conteudo: {
          id,
          nome,
          data_nascimento: '1990-01-01',
          perfil: 'corredor',
          perna_lesionada: 'nenhuma',
          data_lesao: null,
          criado_em: '2026-11-01T10:00:00.000Z',
          atualizado_em: atualizadoEm,
        },
      };
    }

    it('paciente novo é gravado como sincronizado', async () => {
      const id = '22222222-2222-4222-8222-222222222222';
      expect(
        await aplicarPacienteRecebido(
          db,
          pacienteRecebido(id, 'Carla', '2026-11-01T10:00:00.000Z'),
        ),
      ).toBe('gravado');
      expect((await buscarPaciente(db, id))?.nome).toBe('Carla');
      expect(await db.getFirstAsync('SELECT pendente_sync FROM paciente WHERE id = ?', id)).toEqual(
        { pendente_sync: 0 },
      );
    });

    it('recebido mais novo substitui; mais velho ou igual mantém o local', async () => {
      const novo = new Date(Date.parse(ana.atualizadoEm) + 60_000).toISOString();
      expect(
        await aplicarPacienteRecebido(db, pacienteRecebido(ana.id, 'Ana Remota', ana.atualizadoEm)),
      ).toBe('mantido-local');
      expect(
        await aplicarPacienteRecebido(
          db,
          pacienteRecebido(ana.id, 'Ana Velha', '2020-01-01T00:00:00.000Z'),
        ),
      ).toBe('mantido-local');
      expect((await buscarPaciente(db, ana.id))?.nome).toBe('Ana Souza');
      expect(await aplicarPacienteRecebido(db, pacienteRecebido(ana.id, 'Ana Remota', novo))).toBe(
        'gravado',
      );
      expect((await buscarPaciente(db, ana.id))?.nome).toBe('Ana Remota');
    });

    it('avaliação recebida grava o agregado e substitui as filhas', async () => {
      const salva = await salvarCmj();
      const [enviada] = await listarAvaliacoesPendentes(db, 1);
      const conteudo = enviada.conteudo as {
        avaliacao: Record<string, unknown>;
        tentativas: Record<string, unknown>[];
      };
      const novo = new Date(Date.parse(salva.atualizadoEm) + 60_000).toISOString();
      const recebida: RegistroSync = {
        ...enviada,
        atualizadoEm: novo,
        conteudo: {
          ...enviada.conteudo,
          avaliacao: {
            ...conteudo.avaliacao,
            observacoes: 'Editada em outro aparelho',
            atualizado_em: novo,
          },
          tentativas: conteudo.tentativas
            .slice(0, 3)
            .map((t) => ({ ...t, quadro_aterrissagem: 1130 })),
        },
      };

      expect(await aplicarAvaliacaoRecebida(db, recebida)).toBe('gravado');
      expect(await db.getFirstAsync('SELECT observacoes, pendente_sync FROM avaliacao')).toEqual({
        observacoes: 'Editada em outro aparelho',
        pendente_sync: 0,
      });
      const tentativas = await db.getAllAsync<{ quadro_aterrissagem: number }>(
        'SELECT quadro_aterrissagem FROM tentativa',
      );
      expect(tentativas.map((t) => t.quadro_aterrissagem)).toEqual([1130, 1130, 1130]);
    });

    it('falha no meio desfaz a avaliação inteira (paciente inexistente)', async () => {
      const salva = await salvarCmj();
      const [enviada] = await listarAvaliacoesPendentes(db, 1);
      await db.runAsync('DELETE FROM tentativa');
      await db.runAsync('DELETE FROM avaliacao');
      const conteudo = enviada.conteudo as { avaliacao: Record<string, unknown> };
      const orfa: RegistroSync = {
        ...enviada,
        conteudo: {
          ...enviada.conteudo,
          avaliacao: { ...conteudo.avaliacao, paciente_id: '99999999-9999-4999-8999-999999999999' },
        },
      };
      await expect(aplicarAvaliacaoRecebida(db, orfa)).rejects.toThrow();
      expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM avaliacao')).toEqual({ n: 0 });
      expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM tentativa')).toEqual({ n: 0 });
      expect(salva.id).toBe(enviada.id);
    });
  });

  it('estado da sincronização: lê o padrão e grava parcial', async () => {
    expect(await lerEstadoSync(db)).toEqual({
      usuarioEmail: null,
      cursorServidor: 0,
      ultimaSincronizacao: null,
      ultimoResultado: null,
      ultimoErro: null,
    });
    await gravarEstadoSync(db, {
      usuarioEmail: 'ana@exemplo.com',
      cursorServidor: 42,
      ultimoResultado: 'ok',
    });
    expect(await lerEstadoSync(db)).toMatchObject({
      usuarioEmail: 'ana@exemplo.com',
      cursorServidor: 42,
      ultimoResultado: 'ok',
    });
  });
});
