import { buscarAvaliacao, salvarAvaliacao } from '@/database/avaliacoes';
import { aplicarMigracoes } from '@/database/migracoes';
import { inserirPaciente } from '@/database/pacientes';
import type { NovaAvaliacao } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import { montarResumoAgachamento, montarResumoSalto } from '@/utils/resumoAvaliacao';

import { CMJ_BILATERAL, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';
import { repeticao, SERIE_CA02 } from '../helpers/serieDeTeste';

describe('gravação do agachamento', () => {
  let db: BancoDeTeste;
  let bruno: Patient;

  beforeEach(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
    bruno = await inserirPaciente(db, {
      nome: 'Bruno Lima',
      dataNascimento: '1988-07-02',
      perfil: 'corredor',
      pernaLesionada: 'nenhuma',
      dataLesao: null,
    });
  });

  afterEach(() => db.fechar());

  const agach = (extra: Partial<NovaAvaliacao> = {}) =>
    novaAvaliacao(bruno.id, 'agach', [], {
      cargaKg: 60,
      pernaLesionada: 'nenhuma',
      serie: SERIE_CA02,
      ...extra,
    });
  const contar = async (tabela: string) =>
    (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabela}`))?.n;

  it('grava carga, série, 3 repetições numeradas e o resumo, numa transação', async () => {
    const nova = agach();
    const salva = await salvarAvaliacao(db, nova, montarResumoAgachamento(nova), '');

    expect(
      await db.getFirstAsync('SELECT carga_kg, protocolo FROM avaliacao WHERE id = ?', salva.id),
    ).toEqual({ carga_kg: 60, protocolo: 'agach' });
    expect(
      await db.getFirstAsync('SELECT fps, calib_topo_y, calib_base_y FROM serie_agachamento'),
    ).toEqual({
      fps: 60,
      calib_topo_y: 100,
      calib_base_y: 158.5,
    });
    expect(
      (
        await db.getAllAsync<{ numero: number }>('SELECT numero FROM repeticao ORDER BY numero')
      ).map((r) => r.numero),
    ).toEqual([1, 2, 3]);
    expect(await contar('tentativa')).toBe(0);
    const colunas = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('serie_agachamento') UNION SELECT name FROM pragma_table_info('repeticao')",
    );
    expect(colunas.some((c) => /video|uri/i.test(c.name))).toBe(false);
  });

  it('buscarAvaliacao devolve a mesma série e o mesmo resumo', async () => {
    const nova = agach();
    const salva = await salvarAvaliacao(
      db,
      nova,
      montarResumoAgachamento(nova),
      'Boa profundidade.',
    );

    const lida = await buscarAvaliacao(db, salva.id);
    expect(lida?.serie).toEqual(SERIE_CA02);
    expect(lida?.resumo).toEqual(montarResumoAgachamento(nova));
    expect(lida).toEqual(salva);
  });

  it('agach sem série é recusado sem gravar', async () => {
    const nova = agach({ serie: null });
    await expect(salvarAvaliacao(db, nova, montarResumoAgachamento(agach()), '')).rejects.toThrow(
      'série',
    );
    expect(await contar('avaliacao')).toBe(0);
  });

  it('série num protocolo de salto é recusada sem gravar', async () => {
    const nova = novaAvaliacao(bruno.id, 'cmj_bi', CMJ_BILATERAL, { serie: SERIE_CA02 });
    await expect(
      salvarAvaliacao(db, nova, montarResumoSalto({ ...nova, serie: null }), ''),
    ).rejects.toThrow('Só o agachamento');
    expect(await contar('avaliacao')).toBe(0);
  });

  it('repetição 2 começando antes do fim da 1 é recusada sem gravar nada', async () => {
    const serie = {
      ...SERIE_CA02,
      repeticoes: [
        repeticao([0, 200], [54, 258.5], [84, 200]),
        repeticao([80, 200], [180, 265], [210, 200]),
      ],
    };
    await expect(
      salvarAvaliacao(db, agach({ serie }), montarResumoAgachamento(agach()), ''),
    ).rejects.toThrow('depois do fim da anterior');
    expect(await contar('avaliacao')).toBe(0);
    expect(await contar('serie_agachamento')).toBe(0);
  });

  it('falha numa repetição desfaz a avaliação e a série', async () => {
    const serie = {
      ...SERIE_CA02,
      repeticoes: [SERIE_CA02.repeticoes[0], repeticao([126, 200], [180, 265], [180, 200])],
    };
    await expect(
      salvarAvaliacao(db, agach({ serie }), montarResumoAgachamento(agach()), ''),
    ).rejects.toThrow();
    expect(await contar('avaliacao')).toBe(0);
    expect(await contar('serie_agachamento')).toBe(0);
    expect(await contar('repeticao')).toBe(0);
  });
});
