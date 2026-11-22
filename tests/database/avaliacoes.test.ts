import {
  buscarAvaliacao,
  lerResumo,
  listarAvaliacoesDoPaciente,
  salvarAvaliacao,
} from '@/database/avaliacoes';
import { aplicarMigracoes } from '@/database/migracoes';
import { atualizarPaciente, inserirPaciente } from '@/database/pacientes';
import type { NovaAvaliacao } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import { montarResumoSalto } from '@/utils/resumoAvaliacao';

import {
  CMJ_BILATERAL,
  CMJ_UNILATERAL,
  DROP_JUMP,
  novaAvaliacao,
} from '../helpers/avaliacoesDeTeste';
import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('repositório de avaliações', () => {
  let db: BancoDeTeste;
  let ana: Patient;

  beforeEach(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
    ana = await inserirPaciente(db, {
      nome: 'Ana Souza',
      dataNascimento: '1995-03-15',
      perfil: 'pos_lca',
      pernaLesionada: 'direita',
      dataLesao: '2026-05-20',
    });
  });

  afterEach(() => db.fechar());

  const salvar = (nova: NovaAvaliacao, observacoes = '') =>
    salvarAvaliacao(db, nova, montarResumoSalto(nova), observacoes);
  const contar = async (tabela: string) =>
    (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabela}`))?.n;

  it('grava com UUID, carimbos, pendente de sincronizar e a observação sem espaços nas pontas', async () => {
    const salva = await salvar(novaAvaliacao(ana.id, 'cmj_bi', CMJ_BILATERAL), '  Boa execução.  ');

    expect(salva.id).toMatch(UUID);
    expect(salva.criadoEm).toMatch(ISO_UTC);
    expect(salva.atualizadoEm).toBe(salva.criadoEm);
    expect(salva.pendenteSync).toBe(true);
    expect(salva.observacoes).toBe('Boa execução.');
    const linha = await db.getFirstAsync<{ pendente_sync: number; observacoes: string }>(
      'SELECT pendente_sync, observacoes FROM avaliacao WHERE id = ?',
      salva.id,
    );
    expect(linha).toEqual({ pendente_sync: 1, observacoes: 'Boa execução.' });
    expect(await contar('tentativa')).toBe(3);
  });

  it('grava a perna lesionada recebida, mesmo que o paciente mude depois', async () => {
    const salva = await salvar(
      novaAvaliacao(ana.id, 'cmj_uni', CMJ_UNILATERAL, { pernaLesionada: 'direita' }),
    );
    await atualizarPaciente(db, ana.id, {
      nome: ana.nome,
      dataNascimento: ana.dataNascimento,
      perfil: ana.perfil,
      pernaLesionada: 'esquerda',
      dataLesao: ana.dataLesao,
    });

    expect((await buscarAvaliacao(db, salva.id))?.pernaLesionada).toBe('direita');
    expect(await contar('tentativa')).toBe(6);
  });

  it('recusa unilateral com só duas tentativas numa perna, sem gravar', async () => {
    const incompleta = CMJ_UNILATERAL.filter((t) => !(t.perna === 'esquerda' && t.numero === 3));
    await expect(salvar(novaAvaliacao(ana.id, 'cmj_uni', incompleta))).rejects.toThrow('esquerda');
    expect(await contar('avaliacao')).toBe(0);
  });

  it('recusa toque marcado num CMJ', async () => {
    const comToque = CMJ_BILATERAL.map((t) => ({ ...t, quadroToque: 900 }));
    await expect(salvar(novaAvaliacao(ana.id, 'cmj_bi', comToque))).rejects.toThrow('toque');
    expect(await contar('avaliacao')).toBe(0);
  });

  it('falha no CHECK da terceira tentativa desfaz a avaliação inteira', async () => {
    const tentativas = CMJ_BILATERAL.map((t) =>
      t.numero === 3 ? { ...t, quadroAterrissagem: t.quadroDecolagem } : t,
    );
    const nova = novaAvaliacao(ana.id, 'cmj_bi', tentativas);
    const resumo = montarResumoSalto(novaAvaliacao(ana.id, 'cmj_bi', CMJ_BILATERAL));
    await expect(salvarAvaliacao(db, nova, resumo, '')).rejects.toThrow();
    expect(await contar('avaliacao')).toBe(0);
    expect(await contar('tentativa')).toBe(0);
  });

  it('buscarAvaliacao devolve o mesmo resumo e as tentativas; null para id inexistente', async () => {
    const nova = novaAvaliacao(ana.id, 'dj', DROP_JUMP);
    const salva = await salvar(nova, 'Teste');

    const lida = await buscarAvaliacao(db, salva.id);
    expect(lida).toEqual(salva);
    expect(lida?.resumo).toEqual(montarResumoSalto(nova));
    expect(await buscarAvaliacao(db, '00000000-0000-4000-8000-000000000000')).toBeNull();
  });

  it('listarAvaliacoesDoPaciente traz só o paciente pedido, em ordem crescente de data', async () => {
    const bruno = await inserirPaciente(db, {
      nome: 'Bruno Lima',
      dataNascimento: '1988-07-02',
      perfil: 'corredor',
      pernaLesionada: 'nenhuma',
      dataLesao: null,
    });
    const depois = await salvar(
      novaAvaliacao(ana.id, 'cmj_bi', CMJ_BILATERAL, { dataHora: '2026-11-20T09:00' }),
    );
    const antes = await salvar(
      novaAvaliacao(ana.id, 'dj', DROP_JUMP, { dataHora: '2026-10-01T09:00' }),
    );
    await salvar(novaAvaliacao(bruno.id, 'cmj_bi', CMJ_BILATERAL, { pernaLesionada: 'nenhuma' }));

    const lista = await listarAvaliacoesDoPaciente(db, ana.id);
    expect(lista.map((a) => a.id)).toEqual([antes.id, depois.id]);
    expect(lista[0]).toEqual({
      id: antes.id,
      protocolo: 'dj',
      dataHora: '2026-10-01T09:00',
      pernaLesionada: 'direita',
      resumo: antes.resumo,
    });
  });

  it('lerResumo recusa JSON com formato desconhecido', () => {
    expect(() =>
      lerResumo('{"versao":2,"tipo":"salto","pernas":{},"lsi":null,"baixaPrecisao":false}'),
    ).toThrow('formato desconhecido');
    expect(() => lerResumo('[]')).toThrow('formato desconhecido');
    expect(() => lerResumo('não é json')).toThrow('ilegível');
  });

  it('resultado_json inválido no banco faz busca e lista lançarem erro, sem pular a linha', async () => {
    const salva = await salvar(novaAvaliacao(ana.id, 'cmj_bi', CMJ_BILATERAL));
    await db.runAsync('UPDATE avaliacao SET resultado_json = ? WHERE id = ?', '{"x":1}', salva.id);

    await expect(buscarAvaliacao(db, salva.id)).rejects.toThrow('formato desconhecido');
    await expect(listarAvaliacoesDoPaciente(db, ana.id)).rejects.toThrow('formato desconhecido');
  });
});
