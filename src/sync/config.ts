/**
 * Endereço da API (conta e sincronização). Em build de produção só aceita https, para o token nunca
 * trafegar em texto claro (spec 012).
 */
export function urlBaseApi(emDesenvolvimento: boolean = __DEV__): string {
  const url = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  if (url === '') throw new Error('Endereço da API não configurado (EXPO_PUBLIC_API_URL).');
  if (!emDesenvolvimento && !url.startsWith('https://')) {
    throw new Error('O endereço da API precisa usar https.');
  }
  return url;
}
