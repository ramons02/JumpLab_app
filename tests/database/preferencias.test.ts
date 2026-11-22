import { aplicarMigracoes } from '@/database/migracoes';
import {
  CHAVE_SUGESTAO_AUTOMATICA,
  gravarPreferencia,
  lerPreferencia,
} from '@/database/preferencias';

import { criarBancoEmMemoria, type BancoDeTeste } from '../helpers/bancoEmMemoria';

describe('preferências do aparelho (spec 018)', () => {
  let db: BancoDeTeste;

  beforeEach(async () => {
    db = criarBancoEmMemoria();
    await aplicarMigracoes(db);
  });

  afterEach(() => db.fechar());

  it('sem gravação lê null', async () => {
    expect(await lerPreferencia(db, CHAVE_SUGESTAO_AUTOMATICA)).toBeNull();
  });

  it('gravar de novo substitui o valor', async () => {
    await gravarPreferencia(db, CHAVE_SUGESTAO_AUTOMATICA, '1');
    expect(await lerPreferencia(db, CHAVE_SUGESTAO_AUTOMATICA)).toBe('1');
    await gravarPreferencia(db, CHAVE_SUGESTAO_AUTOMATICA, '0');
    expect(await lerPreferencia(db, CHAVE_SUGESTAO_AUTOMATICA)).toBe('0');
    const linhas = await db.getAllAsync('SELECT * FROM preferencia');
    expect(linhas).toHaveLength(1);
  });
});
