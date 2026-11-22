import { buscarAvaliador, salvarAvaliador } from '@/database/avaliador';
import { aplicarMigracoes } from '@/database/migracoes';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

describe('repositório do avaliador', () => {
  let db: BancoDeTeste;

  beforeEach(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
  });

  afterEach(() => db.fechar());

  it('sem configuração, devolve tudo vazio', async () => {
    expect(await buscarAvaliador(db)).toEqual({ nome: '', registro: '' });
  });

  it('gravar duas vezes mantém uma linha só, sem espaços nas pontas', async () => {
    await salvarAvaliador(db, { nome: ' Dra. Marina Costa ', registro: 'CREFITO-12 000000-F ' });
    await salvarAvaliador(db, { nome: 'Dra. Marina Costa', registro: ' CREFITO-12 123456-F' });

    expect(await buscarAvaliador(db)).toEqual({
      nome: 'Dra. Marina Costa',
      registro: 'CREFITO-12 123456-F',
    });
    const total = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM avaliador',
    );
    expect(total?.total).toBe(1);
  });
});
