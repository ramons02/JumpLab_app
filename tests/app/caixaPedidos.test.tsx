import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import { MENSAGEM_SEM_PEDIDOS } from '@/components/CaixaPedidosSenha';
import { gravarSessao } from '@/sync/armazenamentoSessao';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { chamadas, instalarApiFalsa, responder } from '../helpers/apiFalsa';
import { abrirApp, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

const PEDIDOS = [
  {
    id: 13,
    email: 'joao@exemplo.com',
    pedidoEm: '2026-11-22T14:00:00Z',
    status: 'aberto',
    atendidoEm: null,
  },
  {
    id: 12,
    email: 'maria@exemplo.com',
    pedidoEm: '2026-11-22T13:40:00Z',
    status: 'aberto',
    atendidoEm: null,
  },
  {
    id: 9,
    email: 'bia@exemplo.com',
    pedidoEm: '2026-11-20T09:00:00Z',
    status: 'atendido',
    atendidoEm: '2026-11-20T10:00:00Z',
  },
];

async function entrarComo(admin: boolean) {
  await gravarSessao({
    tokenAcesso: 'acesso-1',
    tokenRenovacao: 'renovacao-1',
    conta: { nome: 'Ramon', email: 'ramon@exemplo.com', admin, trocaSenhaObrigatoria: false },
  });
}

const chamouCaixa = () => chamadas.some((c) => c.caminho === '/api/admin/pedidos');

describe('Configurações: caixa de pedidos do administrador', () => {
  beforeEach(async () => {
    limparArmazenamentoSeguro();
    instalarApiFalsa();
    responder('/api/sync/enviar', 'falha');
    responder('/api/sync/receber', 'falha');
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.restoreAllMocks();
  });

  it('conta comum não vê a caixa nem chama a rota do administrador', async () => {
    await entrarComo(false);
    await abrirApp('/settings');
    await screen.findByText('ramon@exemplo.com');

    expect(screen.queryByTestId('caixa-pedidos')).toBeNull();
    expect(chamouCaixa()).toBe(false);
  });

  it('administrador vê a contagem de abertos, e-mail e estado', async () => {
    responder('/api/admin/pedidos', { status: 200, corpo: { sucesso: true, dados: PEDIDOS } });
    await entrarComo(true);
    await abrirApp('/settings');

    expect(await screen.findByText('Administração · pedidos de senha (2)')).toBeOnTheScreen();
    expect(screen.getByText('maria@exemplo.com')).toBeOnTheScreen();
    expect(screen.getByText('Atendido')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /^Gerar senha para/ })).toHaveLength(2);
  });

  it('lista vazia mostra a mensagem', async () => {
    responder('/api/admin/pedidos', { status: 200, corpo: { sucesso: true, dados: [] } });
    await entrarComo(true);
    await abrirApp('/settings');

    expect(await screen.findByText(MENSAGEM_SEM_PEDIDOS)).toBeOnTheScreen();
  });

  it('gerar senha mostra o diálogo, envia pelo WhatsApp e some ao fechar', async () => {
    const abrirLink = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    responder('/api/admin/pedidos', { status: 200, corpo: { sucesso: true, dados: PEDIDOS } });
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
    await entrarComo(true);
    await abrirApp('/settings');

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Gerar senha para maria@exemplo.com' }),
    );

    expect(await screen.findByText('Senha temporária gerada')).toBeOnTheScreen();
    expect(screen.getByText('K7QM-3WZP')).toBeOnTheScreen();
    expect(screen.getByText('Administração · pedidos de senha (1)')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar pelo WhatsApp' }));
    expect(abrirLink).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/wa\.me\/\?text=JumpLab.*K7QM-3WZP/),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByText('K7QM-3WZP')).toBeNull());
    const caixa = screen.getByTestId('caixa-pedidos');
    expect(within(caixa).getAllByText('Atendido')).toHaveLength(2);
  });

  it('sem conexão mostra o aviso', async () => {
    responder('/api/admin/pedidos', 'falha');
    await entrarComo(true);
    await abrirApp('/settings');

    expect(await screen.findByText('Sem conexão.')).toBeOnTheScreen();
  });
});
