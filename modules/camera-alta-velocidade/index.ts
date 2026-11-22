import { requireNativeModule, requireNativeView } from 'expo';
import type { ComponentType, Ref } from 'react';
import type { ViewProps } from 'react-native';

/*
 * Câmera traseira na sessão de alta velocidade do CameraX (spec 011, decisão D21). Só Android; grava sem
 * áudio num arquivo do cache do app.
 */

/** O que a câmera devolve ao parar: caminho no sistema de arquivos e duração. */
export interface GravacaoConcluida {
  caminho: string;
  duracaoS: number;
}

/** Códigos de `onErro`. */
export type CodigoErroCamera = 'SEM_ALTA_VELOCIDADE' | 'TAXA_NAO_SUPORTADA' | 'GRAVACAO_FALHOU';

export interface CameraAltaVelocidadeRef {
  iniciarGravacao(): Promise<void>;
  pararGravacao(): Promise<GravacaoConcluida>;
  cancelarGravacao(): Promise<void>;
}

export interface CameraAltaVelocidadeProps extends ViewProps {
  /** Taxa pedida: 120 ou 240. */
  fps: number;
  /** Desligada fora de foco ou em segundo plano. */
  ativo: boolean;
  /** A câmera aceitou a taxa; `fps` é a que ela vai gravar. */
  onPronta?: (evento: { nativeEvent: { fps: number } }) => void;
  onErro?: (evento: { nativeEvent: { codigo: CodigoErroCamera } }) => void;
  ref?: Ref<CameraAltaVelocidadeRef>;
}

const modulo = requireNativeModule<{ taxasAltaVelocidade(): Promise<number[]> }>(
  'CameraAltaVelocidade',
);

export const CameraAltaVelocidade: ComponentType<CameraAltaVelocidadeProps> =
  requireNativeView<CameraAltaVelocidadeProps>('CameraAltaVelocidade');

/** Taxas de alta velocidade que a câmera traseira libera para o app; vazio se o aparelho não libera. */
export function taxasAltaVelocidade(): Promise<number[]> {
  return modulo.taxasAltaVelocidade();
}
