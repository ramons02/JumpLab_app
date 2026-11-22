import { filtrarDecimal, paraNumeroBr } from '@/utils/numeros';

describe('paraNumeroBr', () => {
  it('converte números com vírgula decimal', () => {
    expect(paraNumeroBr('60')).toBe(60);
    expect(paraNumeroBr('62,5')).toBe(62.5);
  });

  it('devolve null quando não há número', () => {
    expect(paraNumeroBr('')).toBeNull();
    expect(paraNumeroBr(',')).toBeNull();
    expect(paraNumeroBr('abc')).toBeNull();
  });
});

describe('filtrarDecimal', () => {
  it('deixa só dígitos e a primeira vírgula', () => {
    expect(filtrarDecimal('6a2,5,0')).toBe('62,50');
    expect(filtrarDecimal('80')).toBe('80');
    expect(filtrarDecimal('abc')).toBe('');
  });
});
