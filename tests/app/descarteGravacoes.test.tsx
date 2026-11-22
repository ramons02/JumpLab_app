import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { prepararBanco as prepararBancoDoApp } from '@/app/_layout';
import type { VideoSelecionado } from '@/types/attempt';
import { criarTentativasVazias, definirVideo } from '@/utils/tentativas';
import { descartarVideos } from '@/video/descartarVideos';
import { apagarGravacoesOrfas } from '@/video/gravacoesTemporarias';

import { abrirAnalisador, abrirCamera, botaoGravar } from '../helpers/fluxoCamera';
import {
  arquivosFalsos,
  limparSistemaArquivos,
  pastasFalsas,
} from '../helpers/mockSistemaArquivos';
import { reiniciarCamera } from '../helpers/mockCameraAltaVelocidade';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

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
jest.mock('../../global.css', () => ({}));
jest.mock('@/video/gravacoesTemporarias', () => ({
  ...jest.requireActual('@/video/gravacoesTemporarias'),
  apagarGravacoesOrfas: jest.fn(() => Promise.resolve()),
}));

const PASTA = 'file:///cache/gravacoes';

describe('descarte das gravações (D14)', () => {
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

  it('descartarVideos apaga uma vez a gravação reaproveitada em duas tentativas', async () => {
    const uri = `${PASTA}/a.mp4`;
    arquivosFalsos.add(uri);
    const gravado: VideoSelecionado = {
      uri,
      nome: 'gravacao_240fps.mp4',
      duracaoS: 3,
      fpsLido: 240,
      fpsDoArquivo: 240,
      temporario: true,
    };
    const tentativas = criarTentativasVazias('cmj_bi');
    const unica = tentativas.unica?.map((t, i) => (i < 2 ? definirVideo(t, gravado) : t));

    await expect(descartarVideos({ unica })).resolves.toBeUndefined();
    expect(arquivosFalsos.size).toBe(0);
  });

  it('abandonar o analisador depois de gravar deixa cache/gravacoes/ vazia', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const app = await abrirAnalisador();
    await abrirCamera();
    await waitFor(() => expect(botaoGravar()).toBeEnabled());
    await fireEvent.press(botaoGravar());
    await fireEvent.press(await screen.findByRole('button', { name: 'Parar' }));
    await screen.findByText('gravacao_240fps.mp4');
    expect(arquivosFalsos.size).toBe(1);
    expect([...arquivosFalsos][0].startsWith(`${PASTA}/`)).toBe(true);

    await act(async () => router.back());
    await waitFor(() => expect(alerta).toHaveBeenCalled());
    const botoes: AlertButton[] = alerta.mock.calls[0][2] ?? [];
    await act(async () => {
      await botoes.find((b) => b.text === 'Sair')?.onPress?.();
    });

    expect(arquivosFalsos.size).toBe(0);
    await waitFor(() => expect(app.getPathname()).not.toBe('/assessment/analyze'));
  });

  it('a abertura do app apaga as sobras sem esperar e sem travar se falhar', async () => {
    const limpar = jest.mocked(apagarGravacoesOrfas);
    limpar.mockRejectedValueOnce(new Error('sem acesso'));

    const banco = Object.assign(bancoDaTela(), { execAsync: jest.fn(() => Promise.resolve()) });

    await expect(prepararBancoDoApp(banco as never)).resolves.toBeUndefined();
    expect(limpar).toHaveBeenCalledTimes(1);
  });

  it('nenhuma biblioteca de galeria no app (o vídeo gravado não vai para a galeria)', () => {
    const pacote = jest.requireActual('../../package.json') as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(pacote.dependencies)).not.toContain('expo-media-library');
    expect(
      Object.keys(pacote.dependencies).filter((d) => /media-library|camera-roll/.test(d)),
    ).toEqual([]);
  });

  it('a limpeza real apaga a pasta inteira de gravações', async () => {
    const real = jest.requireActual('@/video/gravacoesTemporarias') as {
      apagarGravacoesOrfas: () => Promise<void>;
    };
    pastasFalsas.add(PASTA);
    arquivosFalsos.add(`${PASTA}/sobra.mp4`);
    await real.apagarGravacoesOrfas();
    expect(arquivosFalsos.size).toBe(0);
  });
});
