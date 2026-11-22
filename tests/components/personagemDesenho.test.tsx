import { act, render, screen } from '@testing-library/react-native';

import { PersonagemDesenho } from '@/components/PersonagemDesenho';
import { ESTADO_PARADO } from '@/utils/poseDesenho';

const TAMANHO = { largura: 200, altura: 220 };

describe('PersonagemDesenho', () => {
  let pedirQuadro: jest.SpyInstance;
  let cancelarQuadro: jest.SpyInstance;

  beforeEach(() => {
    pedirQuadro = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);
    cancelarQuadro = jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('desenha escondido do leitor de tela', async () => {
    await render(<PersonagemDesenho estado={ESTADO_PARADO} {...TAMANHO} />);
    const desenho = screen.getByTestId('personagem-desenho', { includeHiddenElements: true });
    expect(desenho.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(desenho.props.accessibilityElementsHidden).toBe(true);
  });

  it('com estado fixo fora do parado, não pede quadro de animação', async () => {
    await render(
      <PersonagemDesenho estado={{ ...ESTADO_PARADO, agachamento: 0.6 }} {...TAMANHO} />,
    );
    expect(pedirQuadro).not.toHaveBeenCalled();
  });

  it('parado e ativo, anima a respiração', async () => {
    await render(<PersonagemDesenho estado={ESTADO_PARADO} {...TAMANHO} />);
    expect(pedirQuadro).toHaveBeenCalled();
  });

  it('com ciclo, chama a função a cada quadro e cancela ao desmontar', async () => {
    let passo: FrameRequestCallback = () => {};
    pedirQuadro.mockImplementation((callback: FrameRequestCallback) => {
      passo = callback;
      return 7;
    });
    const ciclo = jest.fn(() => ({ ...ESTADO_PARADO, agachamento: 0.5, barra: true }));

    const { unmount, rerender } = await render(<PersonagemDesenho estado={ciclo} {...TAMANHO} />);
    const chamadasAntes = ciclo.mock.calls.length;
    await act(async () => passo(16));
    expect(ciclo.mock.calls.length).toBeGreaterThan(chamadasAntes);

    await rerender(<PersonagemDesenho estado={ciclo} ativo={false} {...TAMANHO} />);
    expect(cancelarQuadro).toHaveBeenCalledWith(7);

    cancelarQuadro.mockClear();
    await rerender(<PersonagemDesenho estado={ciclo} {...TAMANHO} />);
    await unmount();
    expect(cancelarQuadro).toHaveBeenCalledWith(7);
  });
});
