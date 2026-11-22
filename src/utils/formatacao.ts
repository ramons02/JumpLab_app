// Casas decimais de exibição das medidas do salto (D12). Os valores calculados nunca são arredondados;
// só a exibição usa estas casas. Reaproveitadas pelas specs 003, 008, 009 e 010.
export const CASAS_ALTURA = 1;
export const CASAS_MARGEM = 1;
export const CASAS_TEMPO_MS = 0;
export const CASAS_RSI = 2;
export const CASAS_LSI = 1;
// Agachamento com barra (spec 014, research R7). CASAS_VELOCIDADE também é usada pelas specs 003 e 009.
export const CASAS_VELOCIDADE = 2;
export const CASAS_TEMPO_AGACH_S = 2;
export const CASAS_AMPLITUDE = 1;
export const CASAS_PERDA = 1;
export const CASAS_POTENCIA = 0;
export const CASAS_CARGA = 1;
export const CASAS_PX_POR_CM = 2;

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

/** Carga com até 1 casa (research R7 da spec 014): 60 dá "60"; 62,5 dá "62,5". */
export function formatarCarga(kg: number): string {
  return formatarDecimal(kg, Number.isInteger(kg) ? 0 : CASAS_CARGA);
}
