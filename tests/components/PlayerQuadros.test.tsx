import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { PlayerQuadros } from '@/components/PlayerQuadros';
import type { VideoSelecionado } from '@/types/attempt';
import { posicaoNoArquivoS } from '@/utils/quadros';

import { mockTocador, reiniciarTocador } from '../helpers/mockExpoVideo';

jest.mock('expo-video', () => jest.requireActual('../helpers/mockExpoVideo').moduloExpoVideo);

const VIDEO: VideoSelecionado = {
  uri: 'file:///d1_240_nativo.mp4',
  nome: 'd1_240_nativo.mp4',
  duracaoS: 3,
  fpsLido: 240,
  fpsDoArquivo: 240,
  temporario: false,
};

const aoMudar = jest.fn();

function TelaControlada({
  video = VIDEO,
  fpsConfirmado = 240,
  inicial = 0,
}: {
  video?: VideoSelecionado;
  fpsConfirmado?: number | null;
  inicial?: number;
}) {
  const [quadro, setQuadro] = useState(inicial);
  return (
    <PlayerQuadros
      video={video}
      fpsConfirmado={fpsConfirmado}
      quadro={quadro}
      onMudarQuadro={(novo) => {
        aoMudar(novo);
        setQuadro(novo);
      }}
    />
  );
}

const mais = () => screen.getByRole('button', { name: '+1 Frame' });
const menos = () => screen.getByRole('button', { name: '-1 Frame' });

describe('PlayerQuadros', () => {
  beforeEach(() => {
    aoMudar.mockClear();
    reiniciarTocador();
  });

  it('abre pausado, mudo, sem controles nativos e com a linha guia', async () => {
    await render(<TelaControlada />);

    expect(mockTocador.muted).toBe(true);
    expect(mockTocador.pause).toHaveBeenCalled();
    expect(screen.getByTestId('video-quadros')).toHaveProp('nativeControls', false);
    expect(screen.getByTestId('linha-guia')).toBeOnTheScreen();
    expect(screen.getByText('Quadro 0 / 719')).toBeOnTheScreen();
  });

  it('cada toque em +1 Frame anda um quadro e posiciona o tocador no meio dele', async () => {
    await render(<TelaControlada />);

    for (let toque = 1; toque <= 5; toque += 1) {
      await fireEvent.press(mais());
      expect(aoMudar).toHaveBeenLastCalledWith(toque);
      expect(mockTocador.currentTime).toBeCloseTo(posicaoNoArquivoS(toque, 240), 9);
    }
    expect(aoMudar).toHaveBeenCalledTimes(5);
    expect(screen.getByText('Quadro 5 / 719')).toBeOnTheScreen();
  });

  it('-1 Frame volta um quadro', async () => {
    await render(<TelaControlada inicial={120} />);

    await fireEvent.press(menos());

    expect(aoMudar).toHaveBeenCalledWith(119);
    expect(screen.getByText('Quadro 119 / 719')).toBeOnTheScreen();
  });

  it('-1 Frame fica desabilitado no primeiro quadro', async () => {
    await render(<TelaControlada />);
    expect(menos()).toBeDisabled();
    expect(mais()).toBeEnabled();
  });

  it('+1 Frame fica desabilitado no último quadro', async () => {
    await render(<TelaControlada inicial={719} />);

    expect(mais()).toBeDisabled();
    await fireEvent.press(mais());
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it('navega pela taxa do arquivo quando ela difere do FPS confirmado', async () => {
    const regravado = { ...VIDEO, duracaoS: 40, fpsDoArquivo: 30 };
    await render(<TelaControlada video={regravado} inicial={120} />);

    expect(screen.getByText('Quadro 120 / 1199')).toBeOnTheScreen();
    expect(mockTocador.currentTime).toBeCloseTo(posicaoNoArquivoS(120, 30), 9);
  });

  it('com um único quadro, os dois botões ficam desabilitados', async () => {
    await render(<TelaControlada video={{ ...VIDEO, duracaoS: 0 }} />);
    expect(menos()).toBeDisabled();
    expect(mais()).toBeDisabled();
  });

  it('sem taxa de navegação, botões e barra ficam desabilitados', async () => {
    await render(<TelaControlada video={{ ...VIDEO, fpsDoArquivo: null }} fpsConfirmado={null} />);

    expect(menos()).toBeDisabled();
    expect(mais()).toBeDisabled();
    expect(screen.getByTestId('barra-quadros')).toBeDisabled();
    expect(
      screen.getByText('Confirme o FPS do vídeo para navegar pelos quadros.'),
    ).toBeOnTheScreen();
  });

  it('arrastar a barra mostra a prévia e soltar muda o quadro', async () => {
    await render(<TelaControlada />);
    const barra = screen.getByTestId('barra-quadros');
    await fireEvent(barra, 'layout', { nativeEvent: { layout: { width: 300, height: 40 } } });

    await fireEvent(barra, 'responderGrant', { nativeEvent: { locationX: 150 } });
    expect(screen.getByText('Quadro 360 / 719')).toBeOnTheScreen();
    expect(aoMudar).not.toHaveBeenCalled();

    await fireEvent(barra, 'responderRelease', { nativeEvent: { locationX: 150 } });
    expect(aoMudar).toHaveBeenCalledWith(360);
    expect(mockTocador.currentTime).toBeCloseTo(posicaoNoArquivoS(360, 240), 9);
  });
});
