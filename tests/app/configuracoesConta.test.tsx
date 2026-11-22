import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import { inserirPaciente, listarPacientesComUltimaAvaliacao } from '@/database/pacientes';
import { gravarSessao, lerSessao } from '@/sync/armazenamentoSessao';
import { chamarApi } from '@/sync/clienteHttp';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { chamadas, instalarApiFalsa, responder, sessaoDto } from '../helpers/apiFalsa';
import { abrirApp, bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

const SESSAO = {
  tokenAcesso: 'acesso-0',
  tokenRenovacao: 'renovacao-0',
  conta: { nome: 'Ana Souza', email: 'ana@exemplo.com', admin: false },
};

async function abrirConfiguracoes() {
  await abrirApp('/settings');
  await screen.findByText('Conta');
}

const aba = (nome: string) => screen.getByRole('tab', { name: nome });
const botao = (nome: string) => screen.getByRole('button', { name: nome });

async function preencherCriacao(senha = 'segredo123', confirmacao = senha) {
  await fireEvent.press(aba('Criar conta'));
  await fireEvent.changeText(screen.getByLabelText('Nome'), 'Ana Souza');
  await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await fireEvent.changeText(screen.getByLabelText('Senha'), senha);
  await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), confirmacao);
}

describe('Configurações: conta', () => {
  beforeEach(async () => {
    limparArmazenamentoSeguro();
    instalarApiFalsa();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('sem sessão: Entrar, Criar conta e o texto de conta opcional, sem nenhuma chamada de rede', async () => {
    await abrirConfiguracoes();

    expect(
      await screen.findByText('A conta serve só para sincronizar. O app funciona inteiro sem ela.'),
    ).toBeOnTheScreen();
    expect(aba('Entrar')).toBeOnTheScreen();
    expect(aba('Criar conta')).toBeOnTheScreen();
    expect(chamadas).toHaveLength(0);
  });

  describe('criar conta', () => {
    it('dados válidos: "Conta criada." e o e-mail conectado com Sair', async () => {
      responder('/api/auth/cadastro', { status: 201, corpo: sessaoDto() });
      await abrirConfiguracoes();
      await preencherCriacao();

      await fireEvent.press(botao('Criar conta'));

      expect(await screen.findByText('ana@exemplo.com')).toBeOnTheScreen();
      expect(botao('Sair')).toBeOnTheScreen();
      expect(await lerSessao()).not.toBeNull();
    });

    it('senha curta e confirmação diferente mostram a mensagem sem chamar a API', async () => {
      await abrirConfiguracoes();
      await preencherCriacao('curta', 'outra');

      await fireEvent.press(botao('Criar conta'));

      expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeOnTheScreen();
      expect(screen.getByText('As senhas não conferem.')).toBeOnTheScreen();
      expect(chamadas).toHaveLength(0);
    });

    it('sem conexão mostra o aviso e mantém nome e e-mail', async () => {
      responder('/api/auth/cadastro', 'falha');
      await abrirConfiguracoes();
      await preencherCriacao();

      await fireEvent.press(botao('Criar conta'));

      expect(
        await screen.findByText(
          'Sem conexão. O app continua funcionando; entre quando houver internet.',
        ),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText('Nome')).toHaveDisplayValue('Ana Souza');
      expect(screen.getByLabelText('E-mail')).toHaveDisplayValue('ana@exemplo.com');
    });

    it('toque duplo faz uma só chamada', async () => {
      responder('/api/auth/cadastro', { status: 201, corpo: sessaoDto() });
      await abrirConfiguracoes();
      await preencherCriacao();

      await act(async () => {
        fireEvent.press(botao('Criar conta'));
        fireEvent.press(botao('Criar conta'));
      });

      await screen.findByText('ana@exemplo.com');
      expect(chamadas.filter((c) => c.caminho === '/api/auth/cadastro')).toHaveLength(1);
    });
  });

  describe('entrar e sair', () => {
    async function preencherEntrada(senha: string) {
      await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
      await fireEvent.changeText(screen.getByLabelText('Senha'), senha);
      await fireEvent.press(botao('Entrar'));
    }

    it('entrar com sucesso mostra o e-mail e Sair', async () => {
      responder('/api/auth/entrar', { status: 200, corpo: sessaoDto() });
      await abrirConfiguracoes();
      await preencherEntrada('segredo123');
      expect(await screen.findByText('ana@exemplo.com')).toBeOnTheScreen();
    });

    it('senha errada mostra a mensagem genérica', async () => {
      responder('/api/auth/entrar', { status: 401, corpo: { sucesso: false, mensagem: 'x' } });
      await abrirConfiguracoes();
      await preencherEntrada('errada123');
      expect(await screen.findByText('E-mail ou senha inválidos.')).toBeOnTheScreen();
    });

    it('sem conexão mostra o aviso e mantém o e-mail', async () => {
      responder('/api/auth/entrar', 'falha');
      await abrirConfiguracoes();
      await preencherEntrada('segredo123');
      expect(
        await screen.findByText(
          'Sem conexão. O app continua funcionando; entre quando houver internet.',
        ),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText('E-mail')).toHaveDisplayValue('ana@exemplo.com');
    });

    it('Sair pede confirmação e depois avisa, com os pacientes ainda no banco', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      responder('/api/auth/sair', { status: 204 });
      await gravarSessao(SESSAO);
      await inserirPaciente(bancoDaTela(), {
        nome: 'Bruno Lima',
        dataNascimento: '1988-07-02',
        perfil: 'corredor',
        pernaLesionada: 'nenhuma',
        dataLesao: null,
      });
      await abrirConfiguracoes();
      await fireEvent.press(await screen.findByRole('button', { name: 'Sair' }));

      expect(alerta).toHaveBeenCalledWith(
        'Sair da conta?',
        'O token é apagado do aparelho. Os dados locais continuam aqui.',
        expect.any(Array),
      );
      const botoes = alerta.mock.calls[0][2] ?? [];
      await act(async () => {
        await botoes.find((b) => b.text === 'Sair')?.onPress?.();
      });

      expect(
        await screen.findByText('Você saiu. Os dados locais continuam no aparelho.'),
      ).toBeOnTheScreen();
      expect(await lerSessao()).toBeNull();
      expect(await listarPacientesComUltimaAvaliacao(bancoDaTela())).toHaveLength(1);
      alerta.mockRestore();
    });

    it('sessão encerrada pelo cliente HTTP mostra "Sua sessão expirou..."', async () => {
      await gravarSessao(SESSAO);
      responder('/api/protegida', { status: 401 });
      responder('/api/auth/renovar', { status: 401 });
      await abrirConfiguracoes();
      await screen.findByText('ana@exemplo.com');

      await act(async () => {
        await chamarApi('/api/protegida', { metodo: 'GET', autenticada: true }, (c) => c);
      });

      await waitFor(() =>
        expect(
          screen.getByText('Sua sessão expirou. Entre de novo para sincronizar.'),
        ).toBeOnTheScreen(),
      );
    });
  });
});
