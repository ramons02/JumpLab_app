import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { AppState, Linking } from 'react-native';

import {
  MENSAGEM_CAMERA_NEGADA,
  MENSAGEM_MOTIVO_CAMERA,
  MENSAGEM_TENTATIVA_INVALIDA,
} from '@/app/assessment/camera';
import {
  MENSAGEM_ERRO_GRAVACAO,
  MENSAGEM_GRAVACAO_CANCELADA,
} from '@/hooks/useGravacaoAltaVelocidade';
import { lerTaxaDoVideo } from '@/video/importarVideo';

import { abrirAnalisador, abrirCamera, botaoGravar, botaoParar } from '../helpers/fluxoCamera';
import { arquivosFalsos, limparSistemaArquivos } from '../helpers/mockSistemaArquivos';
import { camera, reiniciarCamera } from '../helpers/mockCameraAltaVelocidade';
import { fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock(
  'expo-file-system',
  () => jest.requireActual('../helpers/mockSistemaArquivos').moduloFalso,
);
jest.mock('expo-video', () => jest.requireActual('../helpers/mockExpoVideo').moduloExpoVideo);
jest.mock('@/video/importarVideo', () => ({
  importarVideoDaGaleria: jest.fn(),
  lerTaxaDoVideo: jest.fn(() => Promise.resolve(240)),
}));

const ARQUIVO_DA_CAMERA = 'file:///data/camera/VID_1.mp4';

describe('tela de gravação em alta velocidade', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarCamera();
    limparSistemaArquivos();
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.restoreAllMocks();
  });

  it('sem permissão mostra o motivo e pede ao tocar em Permitir câmera', async () => {
    camera.permissao = 'not-determined';
    await abrirAnalisador();
    await abrirCamera();

    expect(await screen.findByText(MENSAGEM_MOTIVO_CAMERA)).toBeOnTheScreen();
    expect(screen.queryByTestId('camera')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Permitir câmera' }));
    expect(await screen.findByTestId('camera')).toBeOnTheScreen();
  });

  it('permissão negada de vez explica e oferece abrir as configurações', async () => {
    camera.permissao = 'not-determined';
    camera.respostaAoPedido = 'denied';
    const abrirConfiguracoes = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await abrirAnalisador();
    await abrirCamera();

    await fireEvent.press(await screen.findByRole('button', { name: 'Permitir câmera' }));
    expect(await screen.findByText(MENSAGEM_CAMERA_NEGADA)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir configurações' }));
    expect(abrirConfiguracoes).toHaveBeenCalled();
  });

  it('câmera com a linha guia e 120 pré-escolhido (padrão, D22)', async () => {
    await abrirAnalisador();
    await abrirCamera();

    await screen.findByTestId('camera');
    expect(camera.ultimasProps?.fps).toBe(120);
    expect(screen.getByTestId('linha-guia')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: '120 fps' })).toBeChecked();
    await waitFor(() => expect(botaoGravar()).toBeEnabled());
  });

  it('grava, mostra REC com tempo e taxa, trava a taxa e entrega o vídeo à tentativa', async () => {
    await abrirAnalisador();
    await abrirCamera();
    await waitFor(() => expect(botaoGravar()).toBeEnabled());

    await fireEvent.press(botaoGravar());
    expect(await screen.findByText('REC 00:00 · 120 fps')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: '240 fps' })).toBeDisabled();

    await fireEvent.press(botaoParar());

    expect(
      await screen.findByText('120 fps lido do vídeo · gravacao_120fps.mp4'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Confirme o FPS para liberar as marcações.')).toBeNull();
    expect(lerTaxaDoVideo).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/cache\/gravacoes\//),
    );
    expect(arquivosFalsos.has(ARQUIVO_DA_CAMERA)).toBe(false);
    expect([...arquivosFalsos]).toEqual([
      expect.stringMatching(/^file:\/\/\/cache\/gravacoes\/.+\.mp4$/),
    ]);
  });

  it('o relógio da gravação avança a cada segundo', async () => {
    jest.useFakeTimers();
    try {
      await abrirAnalisador();
      await abrirCamera();
      await waitFor(() => expect(botaoGravar()).toBeEnabled());
      await fireEvent.press(botaoGravar());
      await act(async () => {
        jest.advanceTimersByTime(65_000);
      });
      expect(screen.getByText('REC 01:05 · 120 fps')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it('voltar durante a gravação cancela e apaga o arquivo', async () => {
    await abrirAnalisador();
    await abrirCamera();
    await waitFor(() => expect(botaoGravar()).toBeEnabled());
    await fireEvent.press(botaoGravar());
    await screen.findByText('REC 00:00 · 120 fps');

    await act(async () => router.back());

    await waitFor(() => expect(camera.cancelamentos).toBe(1));
    expect(arquivosFalsos.size).toBe(0);
    expect(
      await screen.findByRole('button', { name: 'Escolher vídeo da galeria' }),
    ).toBeOnTheScreen();
  });

  it('app em segundo plano durante a gravação cancela, apaga e avisa ao voltar', async () => {
    const ouvintes: ((estado: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, ouvinte) => {
      ouvintes.push(ouvinte as (estado: string) => void);
      return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
    });
    await abrirAnalisador();
    await abrirCamera();
    await waitFor(() => expect(botaoGravar()).toBeEnabled());
    await fireEvent.press(botaoGravar());
    await screen.findByText('REC 00:00 · 120 fps');

    await act(async () => ouvintes.forEach((ouvinte) => ouvinte('background')));
    await act(async () => ouvintes.forEach((ouvinte) => ouvinte('active')));

    expect(await screen.findByText(MENSAGEM_GRAVACAO_CANCELADA)).toBeOnTheScreen();
    expect(camera.cancelamentos).toBe(1);
    expect(arquivosFalsos.size).toBe(0);
    expect(screen.queryByText(/^REC/)).toBeNull();
  });

  it('erro ao gravar mostra a mensagem e não entrega vídeo', async () => {
    camera.falharAoIniciar = true;
    await abrirAnalisador();
    await abrirCamera();
    await waitFor(() => expect(botaoGravar()).toBeEnabled());

    await fireEvent.press(botaoGravar());

    expect(await screen.findByText(MENSAGEM_ERRO_GRAVACAO)).toBeOnTheScreen();
    expect(screen.queryByText('gravacao_240fps.mp4')).toBeNull();
  });

  it('erro no meio da gravação mostra a mensagem e apaga o arquivo', async () => {
    await abrirAnalisador();
    await abrirCamera();
    await waitFor(() => expect(botaoGravar()).toBeEnabled());
    await fireEvent.press(botaoGravar());
    await screen.findByText('REC 00:00 · 120 fps');

    await act(async () => camera.aoFalhar?.());

    expect(await screen.findByText(MENSAGEM_ERRO_GRAVACAO)).toBeOnTheScreen();
    expect(arquivosFalsos.size).toBe(0);
  });

  it('parâmetros inválidos mostram mensagem e voltam', async () => {
    await abrirAnalisador();
    await act(async () => router.push('/assessment/camera?perna=meio&tentativa=9'));

    expect(await screen.findByText(MENSAGEM_TENTATIVA_INVALIDA)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(
      await screen.findByRole('button', { name: 'Escolher vídeo da galeria' }),
    ).toBeOnTheScreen();
  });
});
