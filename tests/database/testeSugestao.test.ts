import { salvarAvaliacao } from '@/database/avaliacoes';
import { aplicarMigracoes } from '@/database/migracoes';
import { inserirPaciente } from '@/database/pacientes';
import { listarParesSugeridoMarcado } from '@/database/testeSugestao';
import { montarResumoSalto } from '@/utils/resumoAvaliacao';

import { CMJ_BILATERAL, DROP_JUMP, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

describe('listarParesSugeridoMarcado (spec 018)', () => {
  let db: BancoDeTeste;

  beforeEach(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
  });

  afterEach(() => db.fechar());

  it('só entram eventos com sugerido e marcado, com o protocolo da avaliação', async () => {
    const ana = await inserirPaciente(db, {
      nome: 'Ana Souza',
      dataNascimento: '1995-03-15',
      perfil: 'corredor',
      pernaLesionada: 'nenhuma',
      dataLesao: null,
    });
    expect(await listarParesSugeridoMarcado(db)).toEqual([]);

    const cmj = CMJ_BILATERAL.map((t, i) =>
      i === 0 ? { ...t, quadrosSugeridos: { decolagem: 999 } } : t,
    );
    const dj = DROP_JUMP.map((t, i) =>
      i === 1
        ? {
            ...t,
            quadrosSugeridos: {
              toque: (t.quadroToque ?? 0) + 2,
              decolagem: t.quadroDecolagem,
              aterrissagem: t.quadroAterrissagem - 1,
            },
          }
        : t,
    );
    for (const [protocolo, tentativas, dataHora] of [
      ['cmj_bi', cmj, '2026-11-22T10:00'],
      ['dj', dj, '2026-11-22T11:00'],
    ] as const) {
      const nova = novaAvaliacao(ana.id, protocolo, tentativas, { dataHora });
      await salvarAvaliacao(db, nova, montarResumoSalto(nova), '');
    }

    const t = DROP_JUMP[1];
    expect(await listarParesSugeridoMarcado(db)).toEqual([
      { protocolo: 'cmj_bi', sugerido: 999, marcado: CMJ_BILATERAL[0].quadroDecolagem },
      { protocolo: 'dj', sugerido: (t.quadroToque ?? 0) + 2, marcado: t.quadroToque },
      { protocolo: 'dj', sugerido: t.quadroDecolagem, marcado: t.quadroDecolagem },
      { protocolo: 'dj', sugerido: t.quadroAterrissagem - 1, marcado: t.quadroAterrissagem },
    ]);
  });
});
