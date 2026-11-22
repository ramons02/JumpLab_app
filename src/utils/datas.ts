const DIGITOS_DATA = 8;
const FORMATO_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** "01022000" -> "01/02/2000", aceitando a digitação parcial. */
export function mascararData(digitado: string): string {
  const digitos = digitado.replace(/\D/g, '').slice(0, DIGITOS_DATA);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** "01/02/2000" -> "2000-02-01"; data incompleta ou inexistente (31/02) -> null. */
export function paraIso(dataBr: string): string | null {
  const partes = FORMATO_BR.exec(dataBr);
  if (!partes) return null;
  const [, dia, mes, ano] = partes;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  const existe =
    data.getUTCFullYear() === Number(ano) &&
    data.getUTCMonth() === Number(mes) - 1 &&
    data.getUTCDate() === Number(dia);
  return existe ? `${ano}-${mes}-${dia}` : null;
}

/** "2000-02-01" -> "01/02/2000" */
export function paraBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Anos completos entre o nascimento e hoje; datas em AAAA-MM-DD. */
export function calcularIdade(nascimentoIso: string, hojeIsoValor: string): number {
  const [anoNasc, mesNasc, diaNasc] = nascimentoIso.split('-').map(Number);
  const [anoHoje, mesHoje, diaHoje] = hojeIsoValor.split('-').map(Number);
  const jaFezAniversario = mesHoje > mesNasc || (mesHoje === mesNasc && diaHoje >= diaNasc);
  return anoHoje - anoNasc - (jaFezAniversario ? 0 : 1);
}

/** Data local de hoje, AAAA-MM-DD. */
export function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}
