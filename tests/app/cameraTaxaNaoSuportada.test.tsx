import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { Linking } from 'react-native';

import {
  MENSAGEM_CAMERA_NAO_ABRIU,
  MENSAGEM_SEM_ALTA_VELOCIDADE,
} from '@/components/SemCameraLenta';
import { importarVideoDaGaleria } from '@/video/importarVideo';

import { abrirAnalisador, abrirCamera, botaoGravar } from '../helpers/fluxoCamera';
import { limparSistemaArquivos } from '../helpers/mockSistemaArquivos';
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

const AVISO = 'Este aparelho grava no máximo a 120 fps. O app não grava em taxa menor sem avisar.';

describe('câmera: taxa não suportada', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarCamera();
    limparSistemaArquivos();
    await prepararBanco();
  });

  afterEach(fecharBanco);

  it('aparelho só com 120 abre com 120 pré-escolhido', async () => {
    camera.maximosFps = [30, 120];
    camera.maximoNegociado = 120;
    await abrirAnalisador();
    await abrirCamera();

    expect(await screen.findByRole('radio', { name: '120 fps' })).toBeChecked();
    await waitFor(() => expect(botaoGravar()).toBeEnabled());
  });

  it('escolher 240 num aparelho de 120 avisa, oferece 120 e bloqueia a gravação (CA02)', async () => {
    camera.maximosFps = [30, 120];
    camera.maximoNegociado = 120;
    await abrirAnalisador();
    await abrirCamera();
    await screen.findByTestId('camera');

    await fireEvent.press(screen.getByRole('radio', { name: '240 fps' }));

    expect(await screen.findByText(AVISO)).toBeOnTheScreen();
    expect(botaoGravar()).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Usar 120 fps' }));
    expect(screen.getByRole('radio', { name: '120 fps' })).toBeChecked();
    await waitFor(() => expect(botaoGravar()).toBeEnabled());
    expect(screen.queryByText(AVISO)).toBeNull();
  });

  it('a câmera que negocia taxa menor que 240 também avisa e bloqueia (FR-003)', async () => {
    camera.maximosFps = [30, 240];
    camera.maximoNegociado = 120;
    await abrirAnalisador();
    await abrirCamera();
    await fireEvent.press(await screen.findByRole('radio', { name: '240 fps' }));

    expect(await screen.findByText(AVISO)).toBeOnTheScreen();
    expect(botaoGravar()).toBeDisabled();
  });

  it('aparelho sem alta velocidade sugere a galeria e não oferece gravar', async () => {
    camera.maximosFps = [30, 60];
    await abrirAnalisador();
    await abrirCamera();

    expect(await screen.findByText(MENSAGEM_SEM_ALTA_VELOCIDADE)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Gravar' })).toBeNull();
  });

  it('aparelho sem câmera traseira também sugere a galeria', async () => {
    camera.temCameraTraseira = false;
    await abrirAnalisador();
    await abrirCamera();

    expect(await screen.findByText(MENSAGEM_SEM_ALTA_VELOCIDADE)).toBeOnTheScreen();
  });

  it('Abrir a câmera do celular abre o app de câmera no modo vídeo', async () => {
    const abrir = jest.spyOn(Linking, 'sendIntent').mockResolvedValue();
    camera.maximosFps = [30, 60];
    await abrirAnalisador();
    await abrirCamera();

    await fireEvent.press(await screen.findByRole('button', { name: 'Abrir a câmera do celular' }));

    expect(abrir).toHaveBeenCalledWith('android.media.action.VIDEO_CAMERA');
    abrir.mockRestore();
  });

  it('se a câmera do celular não abre, avisa', async () => {
    const abrir = jest.spyOn(Linking, 'sendIntent').mockRejectedValue(new Error('sem app'));
    camera.maximosFps = [30, 60];
    await abrirAnalisador();
    await abrirCamera();

    await fireEvent.press(await screen.findByRole('button', { name: 'Abrir a câmera do celular' }));

    expect(await screen.findByText(MENSAGEM_CAMERA_NAO_ABRIU)).toBeOnTheScreen();
    abrir.mockRestore();
  });

  it('Escolher vídeo da galeria entrega o vídeo à tentativa e volta ao analisador', async () => {
    jest.mocked(importarVideoDaGaleria).mockResolvedValue({
      tipo: 'ok',
      video: {
        uri: 'content://galeria/camera-lenta.mp4',
        nome: 'camera-lenta.mp4',
        duracaoS: 4,
        fpsLido: 30,
        fpsDoArquivo: 30,
        temporario: false,
      },
    });
    camera.maximosFps = [30, 60];
    await abrirAnalisador();
    await abrirCamera();

    await fireEvent.press(await screen.findByRole('button', { name: 'Escolher vídeo da galeria' }));

    expect(await screen.findByText('camera-lenta.mp4')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Confirmar FPS' })).toBeOnTheScreen();
  });
});
