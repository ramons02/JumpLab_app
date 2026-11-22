import { forwardRef, useEffect, useImperativeHandle, type Ref } from 'react';
import { PermissionsAndroid, View } from 'react-native';

import { arquivosFalsos } from './mockSistemaArquivos';

type StatusPermissao = 'authorized' | 'not-determined' | 'denied';
interface Props {
  fps: number;
  ativo: boolean;
  testID?: string;
  onPronta?: (e: { nativeEvent: { fps: number } }) => void;
  onErro?: (e: { nativeEvent: { codigo: string } }) => void;
}

/**
 * Módulo `camera-alta-velocidade` simulado (registrado no jest.config.js). Cada teste ajusta `camera`
 * antes de abrir a tela; a permissão vem do PermissionsAndroid, também simulado por `reiniciarCamera`.
 */
export const camera = {
  permissao: 'authorized' as StatusPermissao,
  /** "denied" aqui é o "não perguntar de novo" do Android. */
  respostaAoPedido: 'authorized' as StatusPermissao,
  temCameraTraseira: true,
  /** Maiores taxas da sessão de alta velocidade que o aparelho libera. */
  maximosFps: [120, 240],
  /** Maior taxa que a câmera aceita ao configurar; acima dela responde TAXA_NAO_SUPORTADA. */
  maximoNegociado: 240,
  duracaoS: 3,
  falharAoIniciar: false,
  caminhoGravado: '/data/camera/VID_1.mp4',
  cancelamentos: 0,
  ultimasProps: null as Props | null,
  /** Simula uma falha no meio da gravação. */
  aoFalhar: null as (() => void) | null,
};

export function reiniciarCamera() {
  Object.assign(camera, {
    permissao: 'authorized',
    respostaAoPedido: 'authorized',
    temCameraTraseira: true,
    maximosFps: [120, 240],
    maximoNegociado: 240,
    duracaoS: 3,
    falharAoIniciar: false,
    caminhoGravado: '/data/camera/VID_1.mp4',
    cancelamentos: 0,
    ultimasProps: null,
    aoFalhar: null,
  });
  jest
    .spyOn(PermissionsAndroid, 'check')
    .mockImplementation(async () => camera.permissao === 'authorized');
  jest.spyOn(PermissionsAndroid, 'request').mockImplementation(async () => {
    camera.permissao = camera.respostaAoPedido;
    if (camera.permissao === 'authorized') return PermissionsAndroid.RESULTS.GRANTED;
    return camera.permissao === 'denied'
      ? PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      : PermissionsAndroid.RESULTS.DENIED;
  });
}

export async function taxasAltaVelocidade(): Promise<number[]> {
  return camera.temCameraTraseira ? camera.maximosFps.filter((fps) => fps >= 120) : [];
}

function CameraFalsa(props: Props, ref: Ref<unknown>) {
  const { fps, ativo, onPronta, onErro } = props;
  useEffect(() => {
    camera.ultimasProps = props;
  });
  useEffect(() => {
    if (!ativo) return;
    if (fps <= camera.maximoNegociado) onPronta?.({ nativeEvent: { fps } });
    else onErro?.({ nativeEvent: { codigo: 'TAXA_NAO_SUPORTADA' } });
    // A câmera nativa só reconfigura quando muda a taxa ou liga e desliga.
  }, [fps, ativo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    camera.aoFalhar = () => {
      arquivosFalsos.delete(`file://${camera.caminhoGravado}`);
      onErro?.({ nativeEvent: { codigo: 'GRAVACAO_FALHOU' } });
    };
  }, [onErro]);
  useImperativeHandle(ref, () => ({
    async iniciarGravacao() {
      if (camera.falharAoIniciar) throw new Error('sem espaço');
      arquivosFalsos.add(`file://${camera.caminhoGravado}`);
    },
    async pararGravacao() {
      return { caminho: camera.caminhoGravado, duracaoS: camera.duracaoS };
    },
    async cancelarGravacao() {
      camera.cancelamentos += 1;
      arquivosFalsos.delete(`file://${camera.caminhoGravado}`);
    },
  }));
  return <View testID={props.testID} />;
}

export const CameraAltaVelocidade = forwardRef(CameraFalsa);
