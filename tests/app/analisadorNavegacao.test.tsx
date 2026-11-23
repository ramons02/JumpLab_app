import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaAnalisador from '@/app/assessment/analyze';
import TelaConfiguracao from '@/app/assessment/setup';
import { inserirPaciente } from '@/database/pacientes';
import type { VideoSelecionado } from '@/types/attempt';
import { importarVideoDaGaleria } from '@/video/importarVideo';

import { mockTocador, reiniciarTocador } from '../helpers/mockExpoVideo';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('expo-video', () => jest.requireActual('../helpers/mockExpoVideo').moduloExpoVideo);
jest.mock('@/video/importarVideo', () => ({ importarVideoDaGaleria: jest.fn() }));
jest.mock('@/video/descartarVideos', () => ({ descartarVideos: jest.fn(() => Promise.resolve()) }));

const importar = jest.mocked(importarVideoDaGaleria);

function video(nome: string): VideoSelecionado {
  return {
    uri: `file:///cache/${nome}`,
    nome,
    duracaoS: 3,
    fpsLido: 240,
    fpsDoArquivo: 240,
    temporario: true,
  };
}

async function abrirComVideoConfirmado() {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: 'pos_lca',
    pernaLesionada: 'direita',
    dataLesao: '2026-05-20',
  });
  const app = await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/setup': TelaConfiguracao,
      'assessment/analyze': TelaAnalisador,
    },
    { initialUrl: `/assessment/setup?pacienteId=${paciente.id}` },
  );
  await fireEvent.press(await screen.findByRole('radio', { name: 'CMJ Bilateral' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Ir para o vídeo' }));
  importar.mockResolvedValueOnce({ tipo: 'ok', video: video('salto1.mp4') });
  await fireEvent.press(await screen.findByRole('button', { name: 'Escolher vídeo da galeria' }));
  await screen.findByText(/fps lido do vídeo/);
  return app;
}

const mais = () => screen.getByRole('button', { name: '+1 Frame' });
const menos = () => screen.getByRole('button', { name: '-1 Frame' });

describe('analisador: navegação quadro a quadro', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarTocador();
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.restoreAllMocks();
  });

  it('depois de confirmar o FPS, o tocador aparece no quadro 0 com -1 Frame desabilitado', async () => {
    await abrirComVideoConfirmado();

    expect(await screen.findByText('Quadro 0 / 719')).toBeOnTheScreen();
    expect(screen.getByTestId('tempo-quadro')).toHaveTextContent('0,000 s');
    expect(menos()).toBeDisabled();
    expect(mais()).toBeEnabled();
    expect(mockTocador.fonte).toBe('file:///cache/salto1.mp4');

    await fireEvent.press(mais());
    expect(screen.getByText('Quadro 1 / 719')).toBeOnTheScreen();
  });

  it('trocar o vídeo volta ao quadro 0 e usa o vídeo novo', async () => {
    await abrirComVideoConfirmado();
    await fireEvent.press(await screen.findByRole('button', { name: '+1 Frame' }));
    await fireEvent.press(mais());
    expect(screen.getByText('Quadro 2 / 719')).toBeOnTheScreen();

    importar.mockResolvedValueOnce({ tipo: 'ok', video: video('salto2.mp4') });
    await fireEvent.press(screen.getByRole('button', { name: 'Trocar vídeo' }));

    expect(await screen.findByText('Quadro 0 / 719')).toBeOnTheScreen();
    expect(mockTocador.fonte).toBe('file:///cache/salto2.mp4');
  });

  it('sair da tela desmonta o tocador', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const app = await abrirComVideoConfirmado();
    await screen.findByTestId('video-quadros');

    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.back();
    });
    await waitFor(() => expect(alerta).toHaveBeenCalled());
    const botoes = alerta.mock.calls[0][2] ?? [];
    await act(async () => {
      await botoes.find((b) => b.text === 'Sair')?.onPress?.();
    });

    await waitFor(() => expect(app.getPathname()).not.toBe('/assessment/analyze'));
    expect(screen.queryByTestId('video-quadros')).toBeNull();
  });
});
