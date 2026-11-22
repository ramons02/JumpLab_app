import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaAnalisador from '@/app/assessment/analyze';
import TelaConfiguracao from '@/app/assessment/setup';
import { inserirPaciente } from '@/database/pacientes';
import type { VideoSelecionado } from '@/types/attempt';
import { MENSAGEM_AVISO_FPS } from '@/utils/fps';
import { MENSAGEM_ANTES_DA_ANTERIOR, MENSAGEM_ORDEM } from '@/utils/marcacaoAgachamento';
import { importarVideoDaGaleria } from '@/video/importarVideo';

import { reiniciarTocador } from '../helpers/mockExpoVideo';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('expo-video', () => jest.requireActual('../helpers/mockExpoVideo').moduloExpoVideo);
jest.mock('@/video/importarVideo', () => ({ importarVideoDaGaleria: jest.fn() }));
jest.mock('@/video/descartarVideos', () => ({ descartarVideos: jest.fn(() => Promise.resolve()) }));

const importar = jest.mocked(importarVideoDaGaleria);
/** 10 s a 60 fps: 600 quadros; com a barra de 600 de largura, x = quadro. */
const QUADROS = 600;

function video(nome: string): VideoSelecionado {
  return {
    uri: `file:///cache/${nome}`,
    nome,
    duracaoS: 10,
    fpsLido: 60,
    fpsDoArquivo: 60,
    temporario: true,
  };
}

async function abrirAnalisador() {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Bruno Lima',
    dataNascimento: '1988-07-02',
    perfil: 'corredor',
    pernaLesionada: 'nenhuma',
    dataLesao: null,
  });
  await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/setup': TelaConfiguracao,
      'assessment/analyze': TelaAnalisador,
      'assessment/result': () => <Text>Tela de resultado</Text>,
    },
    { initialUrl: `/assessment/setup?pacienteId=${paciente.id}` },
  );
  await fireEvent.press(await screen.findByRole('radio', { name: 'Agachamento com barra' }));
  await fireEvent.changeText(screen.getByLabelText('Carga na barra (kg)'), '60');
  await fireEvent.press(screen.getByRole('button', { name: 'Ir para o vídeo' }));
  await screen.findByRole('button', { name: 'Escolher vídeo da galeria' });
}

async function escolherVideo(nome = 'serie.mp4') {
  importar.mockResolvedValueOnce({ tipo: 'ok', video: video(nome) });
  await fireEvent.press(
    screen.getByRole('button', { name: /Escolher vídeo da galeria|Trocar vídeo/ }),
  );
  await screen.findByTestId('imagem-video');
  await fireEvent(screen.getByTestId('imagem-video'), 'layout', {
    nativeEvent: { layout: { width: 300, height: 400 } },
  });
  await fireEvent(screen.getByTestId('barra-quadros'), 'layout', {
    nativeEvent: { layout: { width: QUADROS, height: 40 } },
  });
}

async function confirmarFps() {
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar FPS' }));
}

async function irParaQuadro(quadro: number) {
  const barra = screen.getByTestId('barra-quadros');
  await fireEvent(barra, 'responderGrant', { nativeEvent: { locationX: quadro } });
  await fireEvent(barra, 'responderRelease', { nativeEvent: { locationX: quadro } });
}

async function tocarNaImagem(y: number) {
  await fireEvent.press(screen.getByTestId('camada-toque-video'), {
    nativeEvent: { locationY: y },
  });
}

async function calibrar(topo = 100, base = 158.5) {
  await fireEvent.press(screen.getByRole('button', { name: /^(Calibrar|Refazer calibração)$/ }));
  await tocarNaImagem(topo);
  await tocarNaImagem(base);
}

async function marcar(repeticao: number, evento: string, quadro: number, y: number) {
  await irParaQuadro(quadro);
  await fireEvent.press(
    screen.getByRole('button', { name: `${evento} da repetição ${repeticao}` }),
  );
  await tocarNaImagem(y);
}

async function marcarRepeticao(n: number, [i, f, s]: [number, number, number], yFundo = 300) {
  await marcar(n, 'Início da descida', i, 224);
  await marcar(n, 'Fundo', f, yFundo);
  await marcar(n, 'Fim da subida', s, 224);
}

const verResultado = () => screen.getByRole('button', { name: 'Ver resultado' });

describe('analisador do agachamento', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarTocador();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('série única sem tentativas; Calibrar só depois do FPS; 60 fps sem aviso de baixa precisão', async () => {
    await abrirAnalisador();
    expect(screen.queryByText(/tentativa 1 de 3/)).toBeNull();
    await escolherVideo();

    expect(screen.getByRole('button', { name: 'Calibrar' })).toBeDisabled();
    await confirmarFps();
    expect(screen.getByRole('button', { name: 'Calibrar' })).toBeEnabled();
    expect(screen.queryByText(MENSAGEM_AVISO_FPS.baixa_precisao)).toBeNull();
    expect(screen.getByRole('button', { name: 'Início da descida da repetição 1' })).toBeDisabled();
    expect(verResultado()).toBeDisabled();
  });

  it('calibrar com dois toques mostra a escala e as duas linhas do disco', async () => {
    await abrirAnalisador();
    await escolherVideo();
    await confirmarFps();

    await fireEvent.press(screen.getByRole('button', { name: 'Calibrar' }));
    expect(screen.getByText('Toque no topo do disco')).toBeOnTheScreen();
    await tocarNaImagem(100);
    expect(screen.getByText('Toque na base do disco')).toBeOnTheScreen();
    await tocarNaImagem(158.5);

    expect(screen.getByText('Escala: 1,30 px/cm')).toBeOnTheScreen();
    expect(screen.getByTestId('marcador-topo')).toBeOnTheScreen();
    expect(screen.getByTestId('marcador-base')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Refazer calibração' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Início da descida da repetição 1' })).toBeEnabled();
  });

  it('CA01: marca a repetição com quadro e altura e mostra a prévia', async () => {
    await abrirAnalisador();
    await escolherVideo();
    await confirmarFps();
    await calibrar();

    await marcarRepeticao(1, [46, 100, 137]);

    expect(screen.getByRole('button', { name: 'Fim da subida da repetição 1' })).toHaveTextContent(
      'Fim da subida · 137',
    );
    expect(screen.getByTestId('marcador-0-fim')).toBeOnTheScreen();
    expect(screen.getByTestId('previa-agachamento')).toHaveTextContent(
      'Rep 1: 0,95 m/s · 58,5 cm · subida 0,62 s',
      { exact: false },
    );
    expect(verResultado()).toBeEnabled();
  });

  it('CA04: fim no quadro 90 com o fundo no 102 é recusado e nada muda', async () => {
    await abrirAnalisador();
    await escolherVideo();
    await confirmarFps();
    await calibrar();
    await marcar(1, 'Início da descida', 50, 224);
    await marcar(1, 'Fundo', 102, 300);

    await marcar(1, 'Fim da subida', 90, 224);

    expect(screen.getByText(MENSAGEM_ORDEM)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fim da subida da repetição 1' })).toHaveTextContent(
      /^Fim da subida$/,
    );
    expect(verResultado()).toBeDisabled();
  });

  it('+ Repetição só com a última completa; início da 2 antes do fim da 1 é recusado; perda com 2', async () => {
    await abrirAnalisador();
    await escolherVideo();
    await confirmarFps();
    await calibrar();
    expect(screen.getByRole('button', { name: '+ Repetição' })).toBeDisabled();
    await marcarRepeticao(1, [0, 54, 84], 258.5);
    await fireEvent.press(screen.getByRole('button', { name: '+ Repetição' }));

    await marcar(2, 'Início da descida', 80, 224);
    expect(screen.getByText(MENSAGEM_ANTES_DA_ANTERIOR)).toBeOnTheScreen();

    await marcarRepeticao(2, [126, 180, 210], 250);
    expect(screen.getByTestId('previa-agachamento')).toHaveTextContent(
      'Perda de velocidade: 24,6%',
      { exact: false },
    );
  });

  it('refazer a calibração recalcula a prévia', async () => {
    await abrirAnalisador();
    await escolherVideo();
    await confirmarFps();
    await calibrar();
    await marcarRepeticao(1, [46, 100, 137]);

    await calibrar(100, 217); // 2,6 px/cm: metade da amplitude

    expect(screen.getByText('Escala: 2,60 px/cm')).toBeOnTheScreen();
    expect(screen.getByTestId('previa-agachamento')).toHaveTextContent('29,2 cm', { exact: false });
  });

  it('Trocar FPS mantém as marcas; Trocar vídeo apaga calibração e marcas', async () => {
    await abrirAnalisador();
    await escolherVideo();
    await confirmarFps();
    await calibrar();
    await marcarRepeticao(1, [46, 100, 137]);

    await fireEvent.press(screen.getByRole('button', { name: 'Trocar FPS' }));
    await fireEvent.press(screen.getByRole('radio', { name: '120 fps' }));
    await confirmarFps();
    expect(screen.getByTestId('previa-agachamento')).toHaveTextContent('subida 0,31 s', {
      exact: false,
    });

    await escolherVideo('outra.mp4');
    expect(screen.queryByTestId('previa-agachamento')).toBeNull();
    expect(screen.queryByText(/Escala:/)).toBeNull();
  });

  it('Ver resultado abre a tela de resultado', async () => {
    await abrirAnalisador();
    await escolherVideo();
    await confirmarFps();
    await calibrar();
    await marcarRepeticao(1, [46, 100, 137]);

    await act(async () => {
      fireEvent.press(verResultado());
    });

    expect(await screen.findByText('Tela de resultado')).toBeOnTheScreen();
  });
});
