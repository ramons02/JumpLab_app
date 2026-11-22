import { normalizarTexto } from '@/utils/textos';

describe('normalizarTexto', () => {
  it('remove acentos e passa para minúsculas', () => {
    expect(normalizarTexto('Mônica Araújo')).toBe('monica araujo');
    expect(normalizarTexto('JOÃO')).toBe('joao');
  });

  it('remove os espaços das pontas', () => {
    expect(normalizarTexto('  Mônica ')).toBe('monica');
  });

  it('texto só com espaços vira vazio', () => {
    expect(normalizarTexto('   ')).toBe('');
  });
});
