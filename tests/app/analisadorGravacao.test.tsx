import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { abrirAnalisador, abrirCamera, botaoGravar } from '../helpers/fluxoCamera';
import { limparSistemaArquivos } from '../helpers/mockSistemaArquivos';
import { camera, reiniciarCamera } from '../helpers/mockVisionCamera';
import { fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('react-native-vision-camera', () => require('../helpers/mockVisionCamera').moduloFalso);
jest.mock('expo-file-system', () => require('../helpers/mockSistemaArquivos').moduloFalso);
jest.mock('expo-video', () => jest.requireActual('../helpers/mockExpoVideo').moduloExpoVideo);
jest.mock('@/video/importarVideo', () => ({
  importarVideoDaGaleria: jest.fn(),
  lerTaxaDoVideo: jest.fn(() => Promise.resolve(240)),
}));

async function gravarEParar() {
  await waitFor(() => expect(botaoGravar()).toBeEnabled());
  await fireEvent.press(botaoGravar());
  await fireEvent.press(await screen.findByRole('button', { name: 'Parar' }));
}

describe('analisador: gravar com a câmera', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarCamera();
    limparSistemaArquivos();
    await prepararBanco();
  });

  afterEach(fecharBanco);

  it('oferece Gravar com a câmera ao lado de Escolher vídeo da galeria', async () => {
    await abrirAnalisador();
    expect(screen.getByRole('button', { name: 'Escolher vídeo da galeria' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Gravar com a câmera' })).toBeOnTheScreen();
  });

  it('o vídeo gravado volta com 240 selecionado, aguardando a confirmação (CA01)', async () => {
    await abrirAnalisador();
    await abrirCamera();
    await gravarEParar();

    expect(await screen.findByText('gravacao_240fps.mp4')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: '240 fps' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Confirmar FPS' })).toBeOnTheScreen();
    expect(screen.getByText('Confirme o FPS para liberar as marcações.')).toBeOnTheScreen();
  });

  it('a 120 fps o vídeo volta com 120 selecionado', async () => {
    camera.maximosFps = [30, 120];
    camera.maximoNegociado = 120;
    await abrirAnalisador();
    await abrirCamera();
    await gravarEParar();

    expect(await screen.findByText('gravacao_120fps.mp4')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: '120 fps' })).toBeChecked();
  });

  it('no unilateral, o vídeo vai para a perna e a tentativa em que o avaliador está', async () => {
    await abrirAnalisador('CMJ Unilateral');
    await abrirCamera();
    await gravarEParar();

    expect(await screen.findByText('gravacao_240fps.mp4')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Gravar com a câmera' })).toBeNull();
  });
});
