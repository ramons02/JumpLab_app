// Casas decimais de exibição das medidas do salto (D12). Os valores calculados nunca são arredondados;
// só a exibição usa estas casas. Reaproveitadas pelas specs 003, 008, 009 e 010.
export const CASAS_ALTURA = 1;
export const CASAS_MARGEM = 1;
export const CASAS_TEMPO_MS = 0;
export const CASAS_RSI = 2;
export const CASAS_LSI = 1;

const FORMATOS = new Map<number, Intl.NumberFormat>();

/** Número com as casas pedidas e vírgula decimal (pt-BR): (0.5, 3) dá "0,500". */
export function formatarDecimal(valor: number, casas: number): string {
  let formato = FORMATOS.get(casas);
  if (!formato) {
    formato = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
      useGrouping: false,
    });
    FORMATOS.set(casas, formato);
  }
  return formato.format(valor);
}
