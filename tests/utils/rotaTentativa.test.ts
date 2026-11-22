import { lerPernaETentativa } from '@/utils/rotaTentativa';

describe('lerPernaETentativa', () => {
  it('aceita perna e tentativa válidas', () => {
    expect(lerPernaETentativa('esquerda', '3')).toEqual({ perna: 'esquerda', numero: 3 });
    expect(lerPernaETentativa('unica', '1')).toEqual({ perna: 'unica', numero: 1 });
  });

  it('recusa perna ou tentativa fora do esperado', () => {
    expect(lerPernaETentativa('meio', '1')).toBeNull();
    expect(lerPernaETentativa('unica', '4')).toBeNull();
    expect(lerPernaETentativa('unica', '1.0')).toBeNull();
    expect(lerPernaETentativa(undefined, undefined)).toBeNull();
  });
});
