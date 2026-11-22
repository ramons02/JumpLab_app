const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parâmetros de rota com id de paciente ou avaliação são UUIDs gerados no aparelho (D5). */
export function ehUuid(valor: string): boolean {
  return UUID.test(valor);
}
