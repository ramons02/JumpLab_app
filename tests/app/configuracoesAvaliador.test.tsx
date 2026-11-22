import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { buscarAvaliador } from '@/database/avaliador';

import { abrirApp, bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

const campoNome = () => screen.getByLabelText('Nome do avaliador');
const campoRegistro = () => screen.getByLabelText('Registro profissional (CREFITO, CREF...)');

describe('Configurações: avaliador do laudo', () => {
  beforeEach(async () => {
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('grava nome e registro ao sair do campo, recarrega ao abrir de novo e não oferece logotipo', async () => {
    const app = await abrirApp('/settings');
    expect(await screen.findByText('Avaliador (cabeçalho do laudo)')).toBeOnTheScreen();
    expect(screen.queryByText(/logotipo|logo/i)).toBeNull();

    await fireEvent.changeText(campoNome(), ' Dra. Marina Costa ');
    await fireEvent(campoNome(), 'blur');
    await fireEvent.changeText(campoRegistro(), 'CREFITO-12 000000-F');
    await fireEvent(campoRegistro(), 'blur');

    await waitFor(async () =>
      expect(await buscarAvaliador(bancoDaTela())).toEqual({
        nome: 'Dra. Marina Costa',
        registro: 'CREFITO-12 000000-F',
      }),
    );

    app.unmount();
    await abrirApp('/settings');
    await waitFor(() => expect(campoNome()).toHaveDisplayValue('Dra. Marina Costa'));
    expect(campoRegistro()).toHaveDisplayValue('CREFITO-12 000000-F');
  });
});
