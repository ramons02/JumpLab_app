import { fireEvent, screen } from 'expo-router/testing-library';

import {
  MENSAGEM_DIGITE_EMAIL,
  MENSAGEM_PEDIDO_ENVIADO,
  MENSAGEM_PEDIDO_SEM_CONEXAO,
} from '@/components/EsqueciSenha';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { chamadas, instalarApiFalsa, responder } from '../helpers/apiFalsa';
import { abrirApp, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

const link = () => screen.getByRole('button', { name: 'Esqueci minha senha' });
const pedidosFeitos = () => chamadas.filter((c) => c.caminho === '/api/recuperacao/pedidos');

describe('Configurações: Esqueci minha senha', () => {
  beforeEach(async () => {
    limparArmazenamentoSeguro();
    instalarApiFalsa();
    await prepararBanco();
    await abrirApp('/settings');
    await screen.findByText('Conta');
  });

  afterEach(() => fecharBanco());

  it('com e-mail válido envia o pedido e mostra a confirmação', async () => {
    responder('/api/recuperacao/pedidos', { status: 202, corpo: { sucesso: true, dados: null } });
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');

    await fireEvent.press(link());

    expect(await screen.findByText(MENSAGEM_PEDIDO_ENVIADO)).toBeOnTheScreen();
    expect(pedidosFeitos()).toHaveLength(1);
  });

  it('e-mail vazio ou inválido orienta sem chamar a API', async () => {
    await fireEvent.press(link());
    expect(await screen.findByText(MENSAGEM_DIGITE_EMAIL)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana');
    await fireEvent.press(link());
    expect(pedidosFeitos()).toHaveLength(0);
  });

  it('sem conexão avisa que o pedido precisa de internet', async () => {
    responder('/api/recuperacao/pedidos', 'falha');
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');

    await fireEvent.press(link());

    expect(await screen.findByText(MENSAGEM_PEDIDO_SEM_CONEXAO)).toBeOnTheScreen();
  });

  it('o link só aparece no modo Entrar', async () => {
    expect(link()).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Criar conta' }));
    expect(screen.queryByRole('button', { name: 'Esqueci minha senha' })).toBeNull();
  });
});
