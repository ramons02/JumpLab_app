/** "62,5" -> 62.5; sem número -> null. */
export function paraNumeroBr(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (!/^\d*\.?\d*$/.test(normalizado) || !/\d/.test(normalizado)) return null;
  return Number(normalizado);
}

/** Deixa só dígitos e a primeira vírgula, para campos decimais digitados. */
export function filtrarDecimal(texto: string): string {
  const [inteiro, ...resto] = texto.replace(/[^\d,]/g, '').split(',');
  return resto.length ? `${inteiro},${resto.join('')}` : inteiro;
}
