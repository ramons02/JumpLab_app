import { fireEvent, render, screen } from '@testing-library/react-native';

import { BarraDeQuadros } from '@/components/BarraDeQuadros';

const LARGURA = 300;

function toque(x: number) {
  return { nativeEvent: { locationX: x } };
}

async function montar(desabilitada = false, quadro = 0) {
  const onArrastar = jest.fn();
  const onSoltar = jest.fn();
  await render(
    <BarraDeQuadros
      quadro={quadro}
      totalQuadros={720}
      desabilitada={desabilitada}
      onArrastar={onArrastar}
      onSoltar={onSoltar}
    />,
  );
  const barra = screen.getByTestId('barra-quadros');
  await fireEvent(barra, 'layout', { nativeEvent: { layout: { width: LARGURA, height: 40 } } });
  return { barra, onArrastar, onSoltar };
}

describe('BarraDeQuadros', () => {
  it('toque e arrasto chamam onArrastar com o quadro da posição', async () => {
    const { barra, onArrastar } = await montar();

    await fireEvent(barra, 'responderGrant', toque(LARGURA / 2));
    expect(onArrastar).toHaveBeenLastCalledWith(360);

    await fireEvent(barra, 'responderMove', toque(LARGURA / 4));
    expect(onArrastar).toHaveBeenLastCalledWith(180);
  });

  it('soltar chama onSoltar com o quadro inteiro da última posição, limitado', async () => {
    const { barra, onSoltar } = await montar();

    await fireEvent(barra, 'responderGrant', toque(10));
    await fireEvent(barra, 'responderMove', toque(LARGURA + 80));
    await fireEvent(barra, 'responderRelease', toque(LARGURA + 80));

    expect(onSoltar).toHaveBeenCalledTimes(1);
    expect(onSoltar).toHaveBeenCalledWith(719);
  });

  it('desabilitada não responde', async () => {
    const { barra, onArrastar, onSoltar } = await montar(true);

    await fireEvent(barra, 'responderGrant', toque(LARGURA / 2));
    await fireEvent(barra, 'responderRelease', toque(LARGURA / 2));

    expect(onArrastar).not.toHaveBeenCalled();
    expect(onSoltar).not.toHaveBeenCalled();
    expect(barra).toBeDisabled();
  });

  it('a parte preenchida acompanha o quadro', async () => {
    await montar(false, 719);
    expect(screen.getByTestId('barra-quadros-preenchida')).toHaveStyle({ width: '100%' });
  });
});
