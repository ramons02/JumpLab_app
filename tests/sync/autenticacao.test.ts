import { gravarSessao, lerSessao } from '@/sync/armazenamentoSessao';
import { criarConta, entrar, MENSAGEM_CREDENCIAIS, sair } from '@/sync/autenticacao';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { chamadas, instalarApiFalsa, responder, sessaoDto } from '../helpers/apiFalsa';

const DADOS = { nome: ' Ana Souza ', email: ' Ana@Exemplo.com ', senha: 'segredo123' };

describe('autenticação', () => {
  beforeEach(() => {
    limparArmazenamentoSeguro();
    instalarApiFalsa();
  });

  it('criar conta ok grava a sessão e envia o e-mail normalizado', async () => {
    responder('/api/auth/cadastro', { status: 201, corpo: sessaoDto() });
    const r = await criarConta(DADOS);
    expect(r.tipo).toBe('ok');
    expect((await lerSessao())?.conta.email).toBe('ana@exemplo.com');
    expect(JSON.parse(String(chamadas[0].init.body))).toEqual({
      nome: 'Ana Souza',
      email: 'ana@exemplo.com',
      senha: 'segredo123',
    });
  });

  it('criar conta 422 devolve a mensagem da API e não grava', async () => {
    responder('/api/auth/cadastro', {
      status: 422,
      corpo: { sucesso: false, mensagem: 'Já existe conta com este e-mail.' },
    });
    expect(await criarConta(DADOS)).toEqual({
      tipo: 'erro',
      status: 422,
      mensagem: 'Já existe conta com este e-mail.',
    });
    expect(await lerSessao()).toBeNull();
  });

  it('criar conta sem conexão não grava nada', async () => {
    responder('/api/auth/cadastro', 'falha');
    expect(await criarConta(DADOS)).toEqual({ tipo: 'sem-conexao' });
    expect(await lerSessao()).toBeNull();
  });

  it('entrar com 401 devolve a mensagem genérica', async () => {
    responder('/api/auth/entrar', { status: 401, corpo: { sucesso: false } });
    expect(await entrar('ana@exemplo.com', 'errada')).toEqual({
      tipo: 'erro',
      status: 401,
      mensagem: MENSAGEM_CREDENCIAIS,
    });
  });

  it('entrar ok grava a sessão', async () => {
    responder('/api/auth/entrar', { status: 200, corpo: sessaoDto() });
    expect((await entrar('ana@exemplo.com', 'segredo123')).tipo).toBe('ok');
    expect(await lerSessao()).not.toBeNull();
  });

  it('sair apaga a sessão e tenta revogar', async () => {
    responder('/api/auth/sair', { status: 204 });
    await gravarSessao({
      tokenAcesso: 'a',
      tokenRenovacao: 'r',
      conta: { nome: 'Ana', email: 'ana@exemplo.com', admin: false, trocaSenhaObrigatoria: false },
    });
    await sair();
    expect(await lerSessao()).toBeNull();
    expect(JSON.parse(String(chamadas[0].init.body))).toEqual({ tokenRenovacao: 'r' });
  });

  it('sair sem conexão apaga a sessão do mesmo jeito', async () => {
    responder('/api/auth/sair', 'falha');
    await gravarSessao({
      tokenAcesso: 'a',
      tokenRenovacao: 'r',
      conta: { nome: 'Ana', email: 'ana@exemplo.com', admin: false, trocaSenhaObrigatoria: false },
    });
    await sair();
    expect(await lerSessao()).toBeNull();
  });
});
