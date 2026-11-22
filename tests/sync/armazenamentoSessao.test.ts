import * as SecureStore from 'expo-secure-store';

import { apagarSessao, gravarSessao, lerSessao } from '@/sync/armazenamentoSessao';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';

const SESSAO = {
  tokenAcesso: 'acesso',
  tokenRenovacao: 'renovacao',
  conta: { nome: 'Ana Souza', email: 'ana@exemplo.com', admin: false },
};

describe('armazenamento da sessão', () => {
  beforeEach(() => limparArmazenamentoSeguro());

  it('sem nada guardado, não há sessão', async () => {
    expect(await lerSessao()).toBeNull();
  });

  it('ida e volta', async () => {
    await gravarSessao(SESSAO);
    expect(await lerSessao()).toEqual(SESSAO);
  });

  it('apagar remove tudo', async () => {
    await gravarSessao(SESSAO);
    await apagarSessao();
    expect(await lerSessao()).toBeNull();
  });

  it('conteúdo corrompido vira sem sessão', async () => {
    await gravarSessao(SESSAO);
    await SecureStore.setItemAsync('jumplab.conta', '{não é json');
    expect(await lerSessao()).toBeNull();
    await SecureStore.setItemAsync('jumplab.conta', '{"nome":"Ana"}');
    expect(await lerSessao()).toBeNull();
  });
});
