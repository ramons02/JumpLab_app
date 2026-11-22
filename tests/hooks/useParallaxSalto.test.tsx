import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';

import { useParallaxSalto } from '@/hooks/useParallaxSalto';
import {
  ESMAECIMENTO_MAXIMO,
  ESTADO_PARADO,
  FATOR_PARALLAX,
  SUBIDA_LISTA_PX,
} from '@/utils/poseDesenho';

const ALTURA_TELA = 700;
const ROLAVEL = 500;

function rolagem(y: number) {
  return {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 400, height: ALTURA_TELA + ROLAVEL },
      layoutMeasurement: { width: 400, height: ALTURA_TELA },
    },
  } as Parameters<ReturnType<typeof useParallaxSalto>['aoRolar']>[0];
}

function valor(animado: Animated.Value): number {
  return (animado as unknown as { __getValue(): number }).__getValue();
}

async function montar(reduzirMovimento = false) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduzirMovimento);
  const hook = await renderHook(() => useParallaxSalto(SUBIDA_LISTA_PX));
  await act(async () => {});
  return hook;
}

describe('useParallaxSalto', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sem rolagem, o personagem está parado e o topo no lugar', async () => {
    const { result } = await montar();
    expect(result.current.estado).toEqual(ESTADO_PARADO);
    expect(valor(result.current.deslocamentoTopo)).toBe(0);
    expect(valor(result.current.opacidadeTopo)).toBe(1);
  });

  it('22 px de rolagem agacham o personagem e descem o topo 45% disso', async () => {
    const { result } = await montar();
    await act(async () => result.current.aoRolar(rolagem(22)));
    expect(result.current.estado.agachamento).toBeGreaterThan(0.5);
    expect(result.current.estado.subidaPx).toBe(0);
    expect(valor(result.current.deslocamentoTopo)).toBeCloseTo(FATOR_PARALLAX * 22);
  });

  it('110 px completam o salto e esmaecem o topo', async () => {
    const { result } = await montar();
    await act(async () => result.current.aoRolar(rolagem(110)));
    expect(result.current.estado.subidaPx).toBe(SUBIDA_LISTA_PX);
    expect(valor(result.current.opacidadeTopo)).toBeCloseTo(1 - ESMAECIMENTO_MAXIMO);
  });

  it('voltar ao topo deixa o personagem parado de novo', async () => {
    const { result } = await montar();
    await act(async () => result.current.aoRolar(rolagem(110)));
    await act(async () => result.current.aoRolar(rolagem(0)));
    expect(result.current.estado).toEqual(ESTADO_PARADO);
    expect(valor(result.current.opacidadeTopo)).toBe(1);
  });

  it('com "Remover animações" ligado, rolar não move o personagem nem o topo', async () => {
    const { result } = await montar(true);
    await act(async () => result.current.aoRolar(rolagem(110)));
    expect(result.current.estado).toEqual(ESTADO_PARADO);
    expect(valor(result.current.deslocamentoTopo)).toBe(0);
    expect(valor(result.current.opacidadeTopo)).toBe(1);
  });
});
