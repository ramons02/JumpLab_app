import { act, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';

import { ProvedorSessao } from '@/hooks/useSessao';
import { ProvedorSincronizacao, useSincronizacao } from '@/hooks/useSincronizacao';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { criarServidorSync, entrarComo } from '../helpers/servidorSyncFalso';
import { fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

function Estado() {
  const { estado } = useSincronizacao();
  return <Text testID="estado">{estado.tipo}</Text>;
}

function montar() {
  return render(
    <ProvedorSessao>
      <ProvedorSincronizacao>
        <Estado />
      </ProvedorSincronizacao>
    </ProvedorSessao>,
  );
}

describe('ProvedorSincronizacao', () => {
  let servidor: ReturnType<typeof criarServidorSync>;
  let aoMudarApp: ((s: AppStateStatus) => void) | null;

  beforeEach(async () => {
    limparArmazenamentoSeguro();
    servidor = criarServidorSync();
    servidor.instalar();
    await prepararBanco();
    aoMudarApp = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_evento, ouvinte) => {
      aoMudarApp = ouvinte as (s: AppStateStatus) => void;
      return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    fecharBanco();
    jest.restoreAllMocks();
  });

  const rodadas = () => servidor.chamadas.filter((c) => c.rota === '/api/sync/receber').length;

  it('sem sessão não sincroniza e mostra sem-sessao', async () => {
    await montar();
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('sem-sessao'));
    expect(servidor.chamadas).toHaveLength(0);
  });

  it('montar com sessão dispara uma rodada', async () => {
    await entrarComo('ana@exemplo.com');
    await montar();
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('sincronizado'));
    expect(rodadas()).toBe(1);
  });

  it('voltar para o app com sessão dispara outra rodada', async () => {
    await entrarComo('ana@exemplo.com');
    await montar();
    await waitFor(() => expect(rodadas()).toBe(1));

    await act(async () => aoMudarApp?.('active'));

    await waitFor(() => expect(rodadas()).toBe(2));
  });
});
