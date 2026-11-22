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
