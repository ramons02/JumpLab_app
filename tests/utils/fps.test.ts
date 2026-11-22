import {
  avisoDoFps,
  ehBaixaPrecisao,
  FPS_MINIMO,
  normalizarFpsLido,
  opcoesDeFps,
  podeConfirmarFps,
} from '@/utils/fps';

describe('normalizarFpsLido', () => {
  it('arredonda a taxa lida', () => {
    expect(normalizarFpsLido(239.76)).toBe(240);
    expect(normalizarFpsLido(29.97)).toBe(30);
  });

  it.each([0, -1, NaN, Infinity, '240', undefined, null])('"%s" vira null', (valor) => {
    expect(normalizarFpsLido(valor)).toBeNull();
  });
});

describe('opcoesDeFps', () => {
  it('sem leitura ou com valor padrão, oferece 60, 120 e 240', () => {
    expect(opcoesDeFps(null)).toEqual([60, 120, 240]);
    expect(opcoesDeFps(240)).toEqual([60, 120, 240]);
  });

  it('valor fora do padrão entra como opção, em ordem crescente', () => {
    expect(opcoesDeFps(480)).toEqual([60, 120, 240, 480]);
    expect(opcoesDeFps(30)).toEqual([30, 60, 120, 240]);
  });
});

describe('podeConfirmarFps', () => {
  it.each([null, 30, 59])('%s não confirma', (fps) => {
    expect(podeConfirmarFps(fps)).toBe(false);
  });

  it.each([60, 120, 240, 480])('%s confirma', (fps) => {
    expect(podeConfirmarFps(fps)).toBe(true);
  });
});

describe('ehBaixaPrecisao', () => {
  it('60 fps é baixa precisão (D3); 120 e 240 não', () => {
    expect(ehBaixaPrecisao(FPS_MINIMO)).toBe(true);
    expect(ehBaixaPrecisao(120)).toBe(false);
    expect(ehBaixaPrecisao(240)).toBe(false);
  });
});

describe('avisoDoFps', () => {
  it('60 num salto avisa baixa precisão; fora de salto, não', () => {
    expect(avisoDoFps(60, true)).toBe('baixa_precisao');
    expect(avisoDoFps(60, false)).toBeNull();
  });

  it('abaixo de 60 a medida não é confiável', () => {
    expect(avisoDoFps(30, true)).toBe('nao_confiavel');
    expect(avisoDoFps(30, false)).toBe('nao_confiavel');
  });

  it('240 ou sem escolha não avisa', () => {
    expect(avisoDoFps(240, true)).toBeNull();
    expect(avisoDoFps(null, true)).toBeNull();
  });
});
