import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import {
  MENSAGEM_ENTROU_TEMPORARIA,
  MENSAGEM_SENHA_NOVA_SEM_CONEXAO,
} from '@/components/TrocarSenhaObrigatoria';
import { inserirPaciente, listarPacientesComUltimaAvaliacao } from '@/database/pacientes';
import { gravarSessao, lerSessao } from '@/sync/armazenamentoSessao';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { instalarApiFalsa, responder, sessaoDto } from '../helpers/apiFalsa';
import { abrirApp, bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

const titulo = () => screen.queryByText('Crie sua senha nova');
const campo = (rotulo: string) => screen.getByLabelText(rotulo);
const botao = (nome: string) => screen.getByRole('button', { name: nome });

async function comSessaoPendente() {
  await gravarSessao({
    tokenAcesso: 'acesso-temp',
    tokenRenovacao: 'renovacao-temp',
    conta: {
      nome: 'Ana Souza',
      email: 'ana@exemplo.com',
      admin: false,
      trocaSenhaObrigatoria: true,
    },
  });
}

async function preencher(senha: string, confirmacao = senha) {
  await fireEvent.changeText(campo('Senha nova'), senha);
  await fireEvent.changeText(campo('Confirmar senha nova'), confirmacao);
}

describe('troca obrigatória da senha', () => {
  beforeEach(async () => {
    limparArmazenamentoSeguro();
    instalarApiFalsa();
    responder('/api/sync/enviar', 'falha');
    responder('/api/sync/receber', 'falha');
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('entrar com a senha temporária abre a tela por cima de qualquer aba', async () => {
    responder('/api/auth/entrar', {
      status: 200,
      corpo: sessaoDto('1', 'ana@exemplo.com', { trocaSenhaObrigatoria: true }),
    });
    await abrirApp('/settings');
    await fireEvent.changeText(await screen.findByLabelText('E-mail'), 'ana@exemplo.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'K7QM-3WZP');

    await fireEvent.press(botao('Entrar'));

    expect(await screen.findByText('Crie sua senha nova')).toBeOnTheScreen();
    expect(screen.getByText(MENSAGEM_ENTROU_TEMPORARIA)).toBeOnTheScreen();
    expect(screen.getByTestId('troca-senha-obrigatoria')).toBeOnTheScreen();
  });

  it('reabrir o app com a sessão pendente guardada mostra a tela de novo (FR-017)', async () => {
    await comSessaoPendente();
    await abrirApp('/');
    expect(await screen.findByText('Crie sua senha nova')).toBeOnTheScreen();
  });

  it('senha curta e confirmação diferente mostram a mensagem sem chamar a API', async () => {
    await comSessaoPendente();
    await abrirApp('/');
    await screen.findByText('Crie sua senha nova');

    await preencher('1234567');
    await fireEvent.press(botao('Salvar senha nova'));
    expect(
      await screen.findByText('A senha precisa ter pelo menos 8 caracteres.'),
    ).toBeOnTheScreen();

    await preencher('novaSenha123', 'outraSenha1');
    await fireEvent.press(botao('Salvar senha nova'));
    expect(await screen.findByText('As senhas não conferem.')).toBeOnTheScreen();
  });

  it('salvar com sucesso fecha a tela e a sessão fica normal', async () => {
    responder('/api/conta/senha', {
      status: 200,
      corpo: sessaoDto('2', 'ana@exemplo.com', { trocaSenhaObrigatoria: false }),
    });
    await comSessaoPendente();
    await abrirApp('/');
    await screen.findByText('Crie sua senha nova');

    await preencher('novaSenha123');
    await fireEvent.press(botao('Salvar senha nova'));

    await waitFor(() => expect(titulo()).toBeNull());
    expect((await lerSessao())?.conta.trocaSenhaObrigatoria).toBe(false);
  });

  it('sem conexão avisa e mantém a tela', async () => {
    responder('/api/conta/senha', 'falha');
    await comSessaoPendente();
    await abrirApp('/');
    await screen.findByText('Crie sua senha nova');

    await preencher('novaSenha123');
    await fireEvent.press(botao('Salvar senha nova'));

    expect(await screen.findByText(MENSAGEM_SENHA_NOVA_SEM_CONEXAO)).toBeOnTheScreen();
    expect(titulo()).toBeOnTheScreen();
  });

  it('Sair da conta apaga a sessão, mantém os dados locais e libera o app (D17)', async () => {
    responder('/api/auth/sair', 'falha');
    await inserirPaciente(bancoDaTela(), {
      nome: 'Bruno Lima',
      dataNascimento: '1988-07-02',
      perfil: 'corredor',
      pernaLesionada: 'nenhuma',
      dataLesao: null,
    });
    await comSessaoPendente();
    await abrirApp('/');
    await screen.findByText('Crie sua senha nova');

    await fireEvent.press(botao('Sair da conta'));

    await waitFor(() => expect(titulo()).toBeNull());
    expect(await lerSessao()).toBeNull();
    expect(await listarPacientesComUltimaAvaliacao(bancoDaTela())).toHaveLength(1);
  });
});
