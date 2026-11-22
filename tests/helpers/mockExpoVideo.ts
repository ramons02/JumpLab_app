import { createElement } from 'react';
import { View, type ViewProps } from 'react-native';

type Ouvinte = (...argumentos: unknown[]) => void;

/** Tocador do expo-video simulado: guarda o estado e dispara eventos sob pedido do teste. */
export const mockTocador = {
  fonte: null as unknown,
  currentTime: 0,
  muted: false,
  loop: false,
  play: jest.fn(),
  pause: jest.fn(),
  ouvintes: new Map<string, Set<Ouvinte>>(),
  addListener(evento: string, ouvinte: Ouvinte) {
    const lista = this.ouvintes.get(evento) ?? new Set<Ouvinte>();
    lista.add(ouvinte);
    this.ouvintes.set(evento, lista);
    return { remove: () => lista.delete(ouvinte) };
  },
  emitir(evento: string, ...argumentos: unknown[]) {
    this.ouvintes.get(evento)?.forEach((ouvinte) => ouvinte(...argumentos));
  },
};

export function reiniciarTocador() {
  mockTocador.fonte = null;
  mockTocador.currentTime = 0;
  mockTocador.muted = false;
  mockTocador.loop = false;
  mockTocador.play.mockClear();
  mockTocador.pause.mockClear();
  mockTocador.ouvintes.clear();
}

/** Uso: jest.mock('expo-video', () => jest.requireActual('../helpers/mockExpoVideo').moduloExpoVideo). */
export const moduloExpoVideo = {
  useVideoPlayer: (fonte: unknown, configurar?: (tocador: typeof mockTocador) => void) => {
    mockTocador.fonte = fonte;
    configurar?.(mockTocador);
    return mockTocador;
  },
  VideoView: (props: ViewProps) => createElement(View, props),
};
