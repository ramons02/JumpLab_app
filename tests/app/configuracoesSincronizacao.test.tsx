import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { inserirPaciente } from '@/database/pacientes';
import { gravarEstadoSync } from '@/database/sincronizacao';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { criarServidorSync, entrarComo } from '../helpers/servidorSyncFalso';
import { abrirApp, bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

const PACIENTE = {
  nome: 'Ana Souza',
  dataNascimento: '1995-03-15',
  perfil: 'pos_lca' as const,
  pernaLesionada: 'direita' as const,
  dataLesao: '2026-05-20',
};

describe('Configurações: sincronização', () => {
  let servidor: ReturnType<typeof criarServidorSync>;

  beforeEach(async () => {
    limparArmazenamentoSeguro();
    servidor = criarServidorSync();
    servidor.instalar();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  const botao = () => screen.getByRole('button', { name: 'Sincronizar agora' });

  it('sem sessão pede para entrar e o botão fica indisponível', async () => {
    await abrirApp('/settings');
    expect(await screen.findByText('Entre na conta para sincronizar.')).toBeOnTheScreen();
    expect(botao()).toBeDisabled();
  });

  it('com pendentes mostra a quantidade e "Nunca"; sincronizar termina em "Sincronizado" com a data', async () => {
    await inserirPaciente(bancoDaTela(), PACIENTE);
    await inserirPaciente(bancoDaTela(), { ...PACIENTE, nome: 'Bruno' });
    await entrarComo('ana@exemplo.com');
    // A rodada automática da abertura falha sem conexão: os pendentes continuam.
    servidor.falhar('enviar', 'rede');
    await abrirApp('/settings');

    expect(await screen.findByText('Erro: Sem conexão.')).toBeOnTheScreen();
    expect(screen.getByText('2 pendente(s)')).toBeOnTheScreen();
    expect(screen.getByText('Última sincronização: Nunca')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(botao());
    });

    expect(await screen.findByText('Sincronizado')).toBeOnTheScreen();
    expect(
      screen.getByText(/^Última sincronização: \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/),
    ).toBeOnTheScreen();
  });

  it('durante a sincronização mostra "Sincronizando..." e desabilita o botão', async () => {
    await entrarComo('ana@exemplo.com');
    await gravarEstadoSync(bancoDaTela(), { usuarioEmail: 'ana@exemplo.com' });
    let liberar: () => void = () => undefined;
    const fetchOriginal = global.fetch;
    await abrirApp('/settings');
    await screen.findByText('Sincronizado');

    global.fetch = jest.fn(
      (...args: Parameters<typeof fetch>) =>
        new Promise<Response>((resolve) => {
          liberar = () => resolve(fetchOriginal(...args));
        }),
    ) as typeof fetch;
    await act(async () => {
      fireEvent.press(botao());
    });

    expect(await screen.findByText('Sincronizando...')).toBeOnTheScreen();
    expect(botao()).toBeDisabled();
    await act(async () => liberar());
    global.fetch = fetchOriginal;
    await waitFor(() => expect(screen.queryByText('Sincronizando...')).toBeNull());
  });

  it('falha de rede mostra "Erro: Sem conexão." e mantém a contagem', async () => {
    await inserirPaciente(bancoDaTela(), PACIENTE);
    await entrarComo('ana@exemplo.com');
    servidor.falhar('enviar', 'rede');
    servidor.falhar('enviar', 'rede');
    await abrirApp('/settings');
    await screen.findByText('Erro: Sem conexão.');

    await act(async () => {
      fireEvent.press(botao());
    });

    expect(await screen.findByText('Erro: Sem conexão.')).toBeOnTheScreen();
    expect(screen.getByText('1 pendente(s)')).toBeOnTheScreen();
  });
});
