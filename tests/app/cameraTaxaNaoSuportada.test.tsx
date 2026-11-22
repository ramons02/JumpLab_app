import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { MENSAGEM_SEM_ALTA_VELOCIDADE } from '@/app/assessment/camera';

import { abrirAnalisador, abrirCamera, botaoGravar } from '../helpers/fluxoCamera';
import { limparSistemaArquivos } from '../helpers/mockSistemaArquivos';
import { camera, reiniciarCamera } from '../helpers/mockVisionCamera';
import { fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock(
  'react-native-vision-camera',
  () => jest.requireActual('../helpers/mockVisionCamera').moduloFalso,
);
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
});
