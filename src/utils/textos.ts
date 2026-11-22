const MARCAS_DE_ACENTO = /[̀-ͯ]/g;

/** Texto para comparar sem maiúsculas nem acentos: "  Mônica " -> "monica". */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(MARCAS_DE_ACENTO, '').toLowerCase().trim();
}
