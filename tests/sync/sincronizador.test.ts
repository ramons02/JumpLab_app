import { salvarAvaliacao } from '@/database/avaliacoes';
import { aplicarMigracoes } from '@/database/migracoes';
import { atualizarPaciente, buscarPaciente, inserirPaciente } from '@/database/pacientes';
import { contarPendentes, gravarEstadoSync, lerEstadoSync } from '@/database/sincronizacao';
import { lerSessao } from '@/sync/armazenamentoSessao';
import {
  MENSAGEM_OUTRA_CONTA,
  MENSAGEM_RECEBIDO_INVALIDO,
  MENSAGEM_SEM_CONEXAO,
  MENSAGEM_SESSAO_EXPIRADA,
  sincronizar,
} from '@/sync/sincronizador';
import type { Patient } from '@/types/patient';
import { montarResumoSalto } from '@/utils/resumoAvaliacao';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { CMJ_BILATERAL, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';
import { criarServidorSync, entrarComo } from '../helpers/servidorSyncFalso';

const ANA = 'ana@exemplo.com';
const DADOS_PACIENTE = {
  nome: 'Ana Souza',
  dataNascimento: '1995-03-15',
  perfil: 'pos_lca' as const,
  pernaLesionada: 'direita' as const,
  dataLesao: '2026-05-20',
};

async function novoBanco() {
  const db = criarBancoEmMemoria();
  await aplicarMigracoes(db);
  return db;
}

async function salvarCmj(db: BancoDeTeste, paciente: Patient, dataHora = '2026-11-22T10:30') {
  const nova = novaAvaliacao(paciente.id, 'cmj_bi', CMJ_BILATERAL, { dataHora });
  return salvarAvaliacao(db, nova, montarResumoSalto(nova), '');
}

describe('sincronizador', () => {
  let db: BancoDeTeste;
  let servidor: ReturnType<typeof criarServidorSync>;

  beforeEach(async () => {
    limparArmazenamentoSeguro();
    servidor = criarServidorSync();
    servidor.instalar();
    db = await novoBanco();
    await entrarComo(ANA);
  });

  afterEach(() => db.fechar());

  describe('envio (US1)', () => {
    it('3 avaliações e 1 paciente sobem no mesmo lote, paciente antes, e deixam de estar pendentes', async () => {
      const ana = await inserirPaciente(db, DADOS_PACIENTE);
      for (let i = 0; i < 3; i += 1) await salvarCmj(db, ana, `2026-11-2${i}T10:00`);

      const r = await sincronizar(db, ANA, 'manual');

      expect(r).toMatchObject({ enviados: 4, recusados: 0, erro: null });
      expect(servidor.lotes()).toHaveLength(1);
      expect(servidor.lotes()[0].pacientes).toHaveLength(1);
      expect(servidor.lotes()[0].avaliacoes).toHaveLength(3);
      expect(await contarPendentes(db)).toBe(0);
      expect(await lerEstadoSync(db)).toMatchObject({ usuarioEmail: ANA, ultimoResultado: 'ok' });
    });

    it('250 pendentes sobem em 3 lotes', async () => {
      for (let i = 0; i < 250; i += 1)
        await inserirPaciente(db, { ...DADOS_PACIENTE, nome: `P${i}` });
      await sincronizar(db, ANA, 'manual');
      expect(servidor.lotes().map((l) => l.pacientes.length)).toEqual([100, 100, 50]);
      expect(await contarPendentes(db)).toBe(0);
    });

    it('queda de rede no segundo lote mantém pendentes só os não confirmados; a próxima termina sem duplicar', async () => {
      for (let i = 0; i < 150; i += 1)
        await inserirPaciente(db, { ...DADOS_PACIENTE, nome: `P${i}` });
      servidor.falhar('enviar', 'rede', 1);

      const r1 = await sincronizar(db, ANA, 'manual');

      expect(r1).toMatchObject({ enviados: 100, erro: MENSAGEM_SEM_CONEXAO });
      expect(await contarPendentes(db)).toBe(50);

      const r2 = await sincronizar(db, ANA, 'manual');

      expect(r2).toMatchObject({ enviados: 50, erro: null });
      expect(await contarPendentes(db)).toBe(0);
      expect([...servidor.registros.values()].filter((r) => r.tipo === 'paciente')).toHaveLength(
        150,
      );
    });

    it('recusado mantém pendente e registra o erro', async () => {
      const ana = await inserirPaciente(db, DADOS_PACIENTE);
      await salvarCmj(db, ana);
      // Outra conta já tem este paciente: o servidor recusa o paciente e, por isso, a avaliação.
      servidor.registros.set(`paciente:${ana.id}`, {
        tipo: 'paciente',
        id: ana.id,
        atualizadoEm: '2020-01-01T00:00:00.000Z',
        conteudo: {},
        versao: 99,
        dono: 'outra@exemplo.com',
      });

      const r = await sincronizar(db, ANA, 'manual');

      expect(r.recusados).toBe(2);
      expect(r.erro).toBe('Registro não pertence à conta.');
      expect(await contarPendentes(db)).toBe(2);
      expect(await lerEstadoSync(db)).toMatchObject({
        ultimoResultado: 'erro',
        ultimoErro: 'Registro não pertence à conta.',
      });
    });

    it('sessão encerrada no meio para a rodada, mantém os pendentes e avisa', async () => {
      await inserirPaciente(db, DADOS_PACIENTE);
      servidor.falhar('enviar', 401);
      const r = await sincronizar(db, ANA, 'manual');
      expect(r.erro).toBe(MENSAGEM_SESSAO_EXPIRADA);
      expect(await contarPendentes(db)).toBe(1);
      expect(await lerSessao()).toBeNull();
    });

    it('sem sessão nada é chamado', async () => {
      limparArmazenamentoSeguro();
      await inserirPaciente(db, DADOS_PACIENTE);
      const r = await sincronizar(db, ANA, 'manual');
      expect(r.erro).toBe(MENSAGEM_SESSAO_EXPIRADA);
      expect(servidor.chamadas).toHaveLength(0);
    });

    it('duas chamadas simultâneas fazem uma rodada e uma repetição', async () => {
      await inserirPaciente(db, DADOS_PACIENTE);
      const [a, b] = await Promise.all([
        sincronizar(db, ANA, 'abertura'),
        sincronizar(db, ANA, 'login'),
      ]);
      expect(a).toBe(b);
      // Duas rodadas, cada uma com um "receber"; o envio só acontece na primeira.
      expect(servidor.chamadas.filter((c) => c.rota === '/api/sync/receber')).toHaveLength(2);
      expect(servidor.lotes()).toHaveLength(1);
    });

    it('nenhuma requisição leva chave de vídeo; motivos login e avaliação salva rodam igual', async () => {
      const ana = await inserirPaciente(db, DADOS_PACIENTE);
      await sincronizar(db, ANA, 'login');
      await salvarCmj(db, ana);
      await sincronizar(db, ANA, 'avaliacao-salva');
      const corpos = JSON.stringify(servidor.lotes());
      expect(corpos).not.toMatch(/video|"uri"/i);
      expect(await contarPendentes(db)).toBe(0);
    });
  });

  describe('recebimento (US2)', () => {
    it('aparelho vazio recebe tudo em 2 páginas, pacientes antes, e o cursor avança', async () => {
      const outro = await novoBanco();
      const ana = await inserirPaciente(outro, DADOS_PACIENTE);
      for (let i = 0; i < 250; i += 1)
        await inserirPaciente(outro, { ...DADOS_PACIENTE, nome: `P${i}` });
      await salvarCmj(outro, ana);
      await sincronizar(outro, ANA, 'manual');

      const r = await sincronizar(db, ANA, 'login');

      expect(r.erro).toBeNull();
      expect(r.recebidos).toBe(252);
      expect(
        servidor.chamadas.filter((c) => c.rota === '/api/sync/receber').length,
      ).toBeGreaterThanOrEqual(3);
      expect((await buscarPaciente(db, ana.id))?.nome).toBe('Ana Souza');
      expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM tentativa')).toEqual({ n: 3 });
      expect((await lerEstadoSync(db)).cursorServidor).toBe(252);
      expect(await contarPendentes(db)).toBe(0);
      outro.fechar();
    });

    it('registro recebido inválido não é gravado, o cursor não passa dele e o estado mostra erro', async () => {
      servidor.registros.set('paciente:x', {
        tipo: 'paciente',
        id: '33333333-3333-4333-8333-333333333333',
        atualizadoEm: '2026-11-01T10:00:00.000Z',
        conteudo: { id: '33333333-3333-4333-8333-333333333333', nome: 'X', perfil: 'atleta' },
        versao: 1,
        dono: ANA,
      });
      const r = await sincronizar(db, ANA, 'manual');
      expect(r.erro).toBe(MENSAGEM_RECEBIDO_INVALIDO);
      expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM paciente')).toEqual({ n: 0 });
      expect((await lerEstadoSync(db)).cursorServidor).toBe(0);
    });

    it('conflito: o mesmo paciente alterado nos dois aparelhos termina igual, com a versão mais recente', async () => {
      const b = await novoBanco();
      const ana = await inserirPaciente(db, DADOS_PACIENTE);
      await sincronizar(db, ANA, 'manual');
      await sincronizar(b, ANA, 'manual');

      // B edita um minuto depois; A edita dois minutos depois: A é a mais recente.
      const agora = Date.now();
      jest.useFakeTimers({ now: agora + 60_000, doNotFake: ['nextTick', 'setImmediate'] });
      await atualizarPaciente(b, ana.id, { ...DADOS_PACIENTE, nome: 'Ana do aparelho B' });
      jest.setSystemTime(agora + 120_000);
      await atualizarPaciente(db, ana.id, { ...DADOS_PACIENTE, nome: 'Ana do aparelho A' });
      jest.useRealTimers();

      await sincronizar(b, ANA, 'manual');
      await sincronizar(db, ANA, 'manual');
      await sincronizar(b, ANA, 'manual');

      expect((await buscarPaciente(db, ana.id))?.nome).toBe('Ana do aparelho A');
      expect((await buscarPaciente(b, ana.id))?.nome).toBe('Ana do aparelho A');
      b.fechar();
    });
  });

  describe('conta dona (US4)', () => {
    it('aparelho com dados de outra conta não chama a API e avisa', async () => {
      await gravarEstadoSync(db, { usuarioEmail: 'bruno@exemplo.com' });
      const r = await sincronizar(db, ANA, 'manual');
      expect(r.erro).toBe(MENSAGEM_OUTRA_CONTA);
      expect(servidor.chamadas).toHaveLength(0);
    });

    it('a primeira sincronização grava o e-mail da conta como dona', async () => {
      await sincronizar(db, ANA, 'manual');
      expect((await lerEstadoSync(db)).usuarioEmail).toBe(ANA);
    });
  });

  it('desempenho: 500 pacientes e 1000 avaliações em menos de 30 s, com no máximo 15 lotes', async () => {
    const pacientes: Patient[] = [];
    for (let i = 0; i < 500; i += 1)
      pacientes.push(await inserirPaciente(db, { ...DADOS_PACIENTE, nome: `P${i}` }));
    for (let i = 0; i < 1000; i += 1) await salvarCmj(db, pacientes[i % 500]);

    const inicio = performance.now();
    const r = await sincronizar(db, ANA, 'manual');

    expect(r.erro).toBeNull();
    expect(servidor.lotes().length).toBeLessThanOrEqual(15);
    expect(performance.now() - inicio).toBeLessThan(30_000);
    expect(await contarPendentes(db)).toBe(0);
  }, 60_000);
});
