import { formatarDecimal } from '@/utils/formatacao';

describe('formatarDecimal', () => {
  it.each([
    [0.5, 3, '0,500'],
    [30.656, 1, '30,7'],
    [0.981, 2, '0,98'],
    [500, 0, '500'],
    [1234.5, 1, '1234,5'],
  ])('(%p, %p) dá %p', (valor, casas, esperado) => {
    expect(formatarDecimal(valor, casas)).toBe(esperado);
  });
});

describe('formatarCarga', () => {
  it('até 1 casa: inteiro sem casa, fração com uma', () => {
    const { formatarCarga } = jest.requireActual('@/utils/formatacao');
    expect(formatarCarga(60)).toBe('60');
    expect(formatarCarga(62.5)).toBe('62,5');
  });
});
