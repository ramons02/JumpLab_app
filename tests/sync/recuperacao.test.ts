import { gravarSessao, lerSessao } from '@/sync/armazenamentoSessao';
import { criarSenhaNova, pedirRecuperacao } from '@/sync/recuperacao';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { cabecalho, chamadas, instalarApiFalsa, responder, sessaoDto } from '../helpers/apiFalsa';

const PENDENTE = {
  tokenAcesso: 'acesso-temp',
  tokenRenovacao: 'renovacao-temp',
  conta: { nome: 'Ana Souza', email: 'ana@exemplo.com', admin: false, trocaSenhaObrigatoria: true },
};

describe('recuperação de senha (sync)', () => {
  beforeEach(() => {
    limparArmazenamentoSeguro();
    instalarApiFalsa();
  });

  it('pedirRecuperacao: 202 vira ok, manda o e-mail normalizado e sem Authorization', async () => {
    responder('/api/recuperacao/pedidos', { status: 202, corpo: { sucesso: true, dados: null } });

    expect(await pedirRecuperacao(' Ana@Exemplo.com ')).toEqual({ tipo: 'ok', dados: null });
    expect(JSON.parse(String(chamadas[0].init.body))).toEqual({ email: 'ana@exemplo.com' });
    expect(cabecalho(0, 'Authorization')).toBeUndefined();
  });

  it('pedirRecuperacao: falha de rede vira sem-conexao', async () => {
    responder('/api/recuperacao/pedidos', 'falha');
    expect(await pedirRecuperacao('ana@exemplo.com')).toEqual({ tipo: 'sem-conexao' });
  });

  it('criarSenhaNova: ok grava a sessão sem troca pendente', async () => {
    await gravarSessao(PENDENTE);
    responder('/api/conta/senha', {
      status: 200,
      corpo: sessaoDto('2', 'ana@exemplo.com', { trocaSenhaObrigatoria: false }),
    });

    const resultado = await criarSenhaNova('novaSenha123');

    expect(resultado.tipo).toBe('ok');
    expect(cabecalho(0, 'Authorization')).toBe('Bearer acesso-temp');
    expect((await lerSessao())?.conta.trocaSenhaObrigatoria).toBe(false);
    expect((await lerSessao())?.tokenAcesso).toBe('acesso-2');
  });

  it('criarSenhaNova: sem conexão mantém a sessão pendente', async () => {
    await gravarSessao(PENDENTE);
    responder('/api/conta/senha', 'falha');

    expect(await criarSenhaNova('novaSenha123')).toEqual({ tipo: 'sem-conexao' });
    expect((await lerSessao())?.conta.trocaSenhaObrigatoria).toBe(true);
  });
});
