import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { salvarAvaliacao } from '@/database/avaliacoes';
import { inserirPaciente } from '@/database/pacientes';
import { CHAVE_SUGESTAO_AUTOMATICA, lerPreferencia } from '@/database/preferencias';
import { montarResumoSalto } from '@/utils/resumoAvaliacao';

import { CMJ_BILATERAL, DROP_JUMP, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { abrirApp, bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

const chave = () => screen.getByLabelText('Sugestão automática (em teste)');

describe('Configurações: sugestão automática em teste (spec 018)', () => {
  beforeEach(async () => {
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('a chave vem desligada e ligar grava a preferência', async () => {
    await abrirApp('/settings');
    expect(await screen.findByText('Sugestão automática dos quadros')).toBeOnTheScreen();
    await waitFor(() => expect(chave()).not.toBeDisabled());
    expect(chave().props.value).toBe(false);
    expect(screen.getByText('Nenhuma avaliação salva com sugestão ainda.')).toBeOnTheScreen();

    await fireEvent(chave(), 'valueChange', true);
    await waitFor(async () =>
      expect(await lerPreferencia(bancoDaTela(), CHAVE_SUGESTAO_AUTOMATICA)).toBe('1'),
    );
    expect(chave().props.value).toBe(true);
  });

  it('com avaliações sugeridas, mostra o resumo por protocolo, o total e a meta', async () => {
    const db = bancoDaTela();
    const ana = await inserirPaciente(db, {
      nome: 'Ana Souza',
      dataNascimento: '1995-03-15',
      perfil: 'corredor',
      pernaLesionada: 'nenhuma',
      dataLesao: null,
    });
    // CMJ: decolagem a 1 quadro (dentro), aterrissagem a 3 (fora)
    const cmj = CMJ_BILATERAL.map((t, i) =>
      i === 0
        ? {
            ...t,
            quadrosSugeridos: {
              decolagem: t.quadroDecolagem - 1,
              aterrissagem: t.quadroAterrissagem + 3,
            },
          }
        : t,
    );
    // Drop Jump: três eventos dentro
    const dj = DROP_JUMP.map((t, i) =>
      i === 0
        ? {
            ...t,
            quadrosSugeridos: {
              toque: t.quadroToque ?? 0,
              decolagem: t.quadroDecolagem + 2,
              aterrissagem: t.quadroAterrissagem,
            },
          }
        : t,
    );
    for (const [protocolo, tentativas] of [
      ['cmj_bi', cmj],
      ['dj', dj],
    ] as const) {
      const nova = novaAvaliacao(ana.id, protocolo, tentativas);
      await salvarAvaliacao(db, nova, montarResumoSalto(nova), '');
    }

    await abrirApp('/settings');
    expect(await screen.findByTestId('resumo-teste-sugestao')).toBeOnTheScreen();
    expect(screen.getByText('CMJ: 1 de 2 (50%)')).toBeOnTheScreen();
    expect(screen.getByText('Drop Jump: 3 de 3 (100%)')).toBeOnTheScreen();
    expect(screen.queryByText(/^Squat Jump:/)).toBeNull();
    expect(screen.getByText('Total: 4 de 5 (80%) · meta 90%')).toBeOnTheScreen();
  });
});
