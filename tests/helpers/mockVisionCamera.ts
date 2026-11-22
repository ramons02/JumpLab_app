import { createElement, useEffect, useState } from 'react';
import { View } from 'react-native';

import { arquivosFalsos } from './mockSistemaArquivos';

type StatusPermissao = 'authorized' | 'not-determined' | 'denied';
type AoTerminar = (caminho: string, motivo: string) => void;
type AoFalhar = (erro: Error) => void;

/**
 * Câmera simulada do `react-native-vision-camera` (v5). Cada teste ajusta `camera` antes de abrir a
 * tela. Uso: `jest.mock('react-native-vision-camera', () => jest.requireActual('../helpers/mockVisionCamera').moduloFalso)`.
 */
export const camera = {
  permissao: 'authorized' as StatusPermissao,
  respostaAoPedido: 'authorized' as StatusPermissao,
  temCameraTraseira: true,
  /** Maiores taxas das faixas do aparelho (`supportedFPSRanges`). */
  maximosFps: [30, 240],
  /** Maior taxa que a câmera aceita na negociação; abaixo da pedida, a sessão escolhe esta. */
  maximoNegociado: 240,
  duracaoS: 3,
  falharAoIniciar: false,
  caminhoGravado: '/data/camera/VID_1.mp4',
  cancelamentos: 0,
  /** Props recebidas pela última `<Camera>` montada. */
  ultimasProps: null as Record<string, unknown> | null,
  aoTerminar: null as AoTerminar | null,
  aoFalhar: null as AoFalhar | null,
};

export function reiniciarCamera() {
  Object.assign(camera, {
    permissao: 'authorized',
    respostaAoPedido: 'authorized',
    temCameraTraseira: true,
    maximosFps: [30, 240],
    maximoNegociado: 240,
    duracaoS: 3,
    falharAoIniciar: false,
    caminhoGravado: '/data/camera/VID_1.mp4',
    cancelamentos: 0,
    ultimasProps: null,
    aoTerminar: null,
    aoFalhar: null,
  });
}

const gravador = {
  get recordedDuration() {
    return camera.duracaoS;
  },
  get filePath() {
    return camera.caminhoGravado;
  },
  async startRecording(aoTerminar: AoTerminar, aoFalhar: AoFalhar) {
    if (camera.falharAoIniciar) throw new Error('sem espaço');
    camera.aoTerminar = aoTerminar;
    camera.aoFalhar = aoFalhar;
    arquivosFalsos.add(`file://${camera.caminhoGravado}`);
  },
  async stopRecording() {
    camera.aoTerminar?.(camera.caminhoGravado, 'stopped');
  },
  async cancelRecording() {
    camera.cancelamentos += 1;
  },
};

function CameraFalsa(props: Record<string, unknown>) {
  useEffect(() => {
    camera.ultimasProps = props;
  });
  const restricoes = props.constraints as { fps?: number }[];
  const pedida = restricoes.find((r) => r.fps !== undefined)?.fps;
  const aoConfigurar = props.onSessionConfigSelected as (config: { selectedFPS?: number }) => void;
  useEffect(() => {
    if (!props.isActive) return;
    aoConfigurar({
      selectedFPS: pedida === undefined ? undefined : Math.min(pedida, camera.maximoNegociado),
    });
  }, [pedida, props.isActive, aoConfigurar]);
  return createElement(View, { testID: 'camera' });
}

export const moduloFalso = {
  useCameraPermission() {
    const [status, setStatus] = useState<StatusPermissao>(camera.permissao);
    return {
      status,
      hasPermission: status === 'authorized',
      canRequestPermission: status === 'not-determined',
      requestPermission: async () => {
        camera.permissao = camera.respostaAoPedido;
        setStatus(camera.permissao);
        return camera.permissao === 'authorized';
      },
    };
  },
  useCameraDevice: () =>
    camera.temCameraTraseira
      ? { supportedFPSRanges: camera.maximosFps.map((max) => ({ min: 1, max })) }
      : undefined,
  useVideoOutput: () => saidaDeVideo,
  Camera: CameraFalsa,
};

const saidaDeVideo = { createRecorder: async () => gravador };
