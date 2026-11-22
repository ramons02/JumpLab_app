import {
  buscarAvaliacao,
  listarAvaliacoesDoPaciente,
  salvarAvaliacao,
} from '@/database/avaliacoes';
import { aplicarMigracoes } from '@/database/migracoes';
import { inserirPaciente } from '@/database/pacientes';
import { montarResumoSalto } from '@/utils/resumoAvaliacao';

import { CMJ_BILATERAL, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { criarBancoEmMemoria } from '../helpers/bancoEmMemoria';

const TOTAL = 1000;

async function medirMs(tarefa: () => Promise<unknown>): Promise<number> {
  const inicio = performance.now();
  await tarefa();
  return performance.now() - inicio;
}

describe('desempenho das avaliações (metas do plan.md da spec 008)', () => {
  it('com 1000 avaliações, salvar < 1 s e buscar e listar < 500 ms', async () => {
    const db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
    const paciente = await inserirPaciente(db, {
      nome: 'Ana Souza',
      dataNascimento: '1995-03-15',
      perfil: 'pos_lca',
      pernaLesionada: 'direita',
      dataLesao: '2026-05-20',
    });
    const resumo = montarResumoSalto(novaAvaliacao(paciente.id, 'cmj_bi', CMJ_BILATERAL));
    for (let i = 0; i < TOTAL - 1; i += 1) {
      const dia = String((i % 28) + 1).padStart(2, '0');
      await salvarAvaliacao(
        db,
        novaAvaliacao(paciente.id, 'cmj_bi', CMJ_BILATERAL, { dataHora: `2026-10-${dia}T09:00` }),
        resumo,
        '',
      );
    }

    let ultima = '';
    const salvar = await medirMs(async () => {
      ultima = (
        await salvarAvaliacao(db, novaAvaliacao(paciente.id, 'cmj_bi', CMJ_BILATERAL), resumo, '')
      ).id;
    });
    const buscar = await medirMs(() => buscarAvaliacao(db, ultima));
    let quantidade = 0;
    const listar = await medirMs(async () => {
      quantidade = (await listarAvaliacoesDoPaciente(db, paciente.id)).length;
    });

    expect(quantidade).toBe(TOTAL);
    expect(salvar).toBeLessThan(1000);
    expect(buscar).toBeLessThan(500);
    expect(listar).toBeLessThan(500);
    db.fechar();
  });
});
