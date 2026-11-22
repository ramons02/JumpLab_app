import { calcularIdade, hojeIso, mascararData, paraBr, paraIso } from '@/utils/datas';

describe('mascararData', () => {
  it('insere as barras enquanto o avaliador digita', () => {
    expect(mascararData('0')).toBe('0');
    expect(mascararData('010')).toBe('01/0');
    expect(mascararData('01022000')).toBe('01/02/2000');
  });

  it('ignora o que não é dígito e corta no oitavo dígito', () => {
    expect(mascararData('01/02/2000')).toBe('01/02/2000');
    expect(mascararData('01a02b20001234')).toBe('01/02/2000');
  });
});

describe('paraIso', () => {
  it('converte dd/mm/aaaa em AAAA-MM-DD', () => {
    expect(paraIso('01/02/2000')).toBe('2000-02-01');
  });

  it('devolve null para data incompleta ou inexistente', () => {
    expect(paraIso('')).toBeNull();
    expect(paraIso('01/02/20')).toBeNull();
    expect(paraIso('31/02/2000')).toBeNull();
    expect(paraIso('29/02/2023')).toBeNull();
    expect(paraIso('00/01/2000')).toBeNull();
    expect(paraIso('10/13/2000')).toBeNull();
  });

  it('aceita 29/02 em ano bissexto', () => {
    expect(paraIso('29/02/2024')).toBe('2024-02-29');
  });
});

describe('paraBr', () => {
  it('converte AAAA-MM-DD em dd/mm/aaaa', () => {
    expect(paraBr('2000-02-01')).toBe('01/02/2000');
  });
});

describe('calcularIdade', () => {
  it('conta só anos completos', () => {
    expect(calcularIdade('1995-03-15', '2026-03-14')).toBe(30);
    expect(calcularIdade('1995-03-15', '2026-03-15')).toBe(31);
    expect(calcularIdade('1995-03-15', '2026-11-22')).toBe(31);
  });

  it('quem nasceu em 29/02 faz aniversário em 01/03 nos anos não bissextos', () => {
    expect(calcularIdade('2000-02-29', '2023-02-28')).toBe(22);
    expect(calcularIdade('2000-02-29', '2023-03-01')).toBe(23);
    expect(calcularIdade('2000-02-29', '2024-02-29')).toBe(24);
  });
});

describe('hojeIso', () => {
  it('devolve a data local de hoje em AAAA-MM-DD', () => {
    const agora = new Date();
    const esperado = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, '0'),
      String(agora.getDate()).padStart(2, '0'),
    ].join('-');
    expect(hojeIso()).toBe(esperado);
  });
});
