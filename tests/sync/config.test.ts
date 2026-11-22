import { urlBaseApi } from '@/sync/config';

describe('urlBaseApi', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('lê EXPO_PUBLIC_API_URL sem a barra final', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.jumplab.app/';
    expect(urlBaseApi(false)).toBe('https://api.jumplab.app');
  });

  it('em desenvolvimento aceita http (API local)', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://192.168.0.10:8080';
    expect(urlBaseApi(true)).toBe('http://192.168.0.10:8080');
  });

  it('fora de desenvolvimento recusa http', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.jumplab.app';
    expect(() => urlBaseApi(false)).toThrow('https');
  });

  it('sem endereço configurado lança erro', () => {
    expect(() => urlBaseApi(true)).toThrow('não configurado');
  });
});
