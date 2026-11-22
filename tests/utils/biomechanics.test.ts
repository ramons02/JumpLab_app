import { tempoS } from '@/utils/biomechanics';

describe('tempoS', () => {
  it('120 quadros a 240 fps dão 0,5 s', () => {
    expect(tempoS(0, 120, 240)).toBe(0.5);
    expect(tempoS(1000, 1120, 240)).toBe(0.5);
  });

  it('quadros iguais dão 0', () => {
    expect(tempoS(50, 50, 240)).toBe(0);
  });

  it.each([0, -240, Number.NaN, Number.POSITIVE_INFINITY])('FPS %p lança RangeError', (fps) => {
    expect(() => tempoS(0, 120, fps)).toThrow(RangeError);
  });

  it('quadro final menor que o inicial lança RangeError', () => {
    expect(() => tempoS(120, 0, 240)).toThrow(RangeError);
  });
});
