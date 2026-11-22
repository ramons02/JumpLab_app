import { gerarSenhaTemporaria, listarPedidos } from '@/sync/administracao';
import { gravarSessao } from '@/sync/armazenamentoSessao';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { cabecalho, instalarApiFalsa, responder } from '../helpers/apiFalsa';

const PEDIDO = {
  id: 12,
  email: 'maria@exemplo.com',
  pedidoEm: '2026-11-22T13:40:00Z',
  status: 'aberto',
  atendidoEm: null,
};

describe('administração (sync)', () => {
  beforeEach(async () => {
    limparArmazenamentoSeguro();
    instalarApiFalsa();
    await gravarSessao({
      tokenAcesso: 'acesso-admin',
      tokenRenovacao: 'renovacao-admin',
      conta: {
        nome: 'Ramon',
        email: 'admin@exemplo.com',
        admin: true,
        trocaSenhaObrigatoria: false,
      },
    });
  });

  it('listarPedidos e gerarSenhaTemporaria vão com o token', async () => {
    responder('/api/admin/pedidos', { status: 200, corpo: { sucesso: true, dados: [PEDIDO] } });
    responder('/api/admin/pedidos/12/senha-temporaria', {
      status: 201,
      corpo: {
        sucesso: true,
        dados: {
          pedidoId: 12,
          email: 'maria@exemplo.com',
          senhaTemporaria: 'K7QM-3WZP',
          validaAte: '2026-11-23T13:45:00Z',
        },
      },
    });

    expect(await listarPedidos()).toEqual({ tipo: 'ok', dados: [PEDIDO] });
    expect(cabecalho(0, 'Authorization')).toBe('Bearer acesso-admin');
    const gerada = await gerarSenhaTemporaria(12);
    expect(gerada.tipo === 'ok' && gerada.dados.senhaTemporaria).toBe('K7QM-3WZP');
  });

  it('403 devolve erro com a mensagem da API', async () => {
    responder('/api/admin/pedidos', {
      status: 403,
      corpo: { sucesso: false, mensagem: 'Acesso negado.' },
    });
    expect(await listarPedidos()).toEqual({
      tipo: 'erro',
      status: 403,
      mensagem: 'Acesso negado.',
    });
  });

  it('senha fora do formato é recusada', async () => {
    responder('/api/admin/pedidos/12/senha-temporaria', {
      status: 201,
      corpo: {
        sucesso: true,
        dados: { pedidoId: 12, email: 'm@x.com', senhaTemporaria: 'abc', validaAte: 'x' },
      },
    });
    expect((await gerarSenhaTemporaria(12)).tipo).toBe('erro');
  });
});
