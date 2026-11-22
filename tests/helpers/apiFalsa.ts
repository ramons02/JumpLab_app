/** fetch simulado: respostas em fila por rota, com o registro das chamadas. */
export interface RespostaFalsa {
  status: number;
  corpo?: unknown;
}

export const URL_API = 'http://api.teste';

type Resposta = RespostaFalsa | 'falha' | ((init: RequestInit) => RespostaFalsa | 'falha');

const filas = new Map<string, Resposta[]>();
export const chamadas: { caminho: string; init: RequestInit }[] = [];

export function responder(caminho: string, ...respostas: Resposta[]) {
  filas.set(caminho, [...(filas.get(caminho) ?? []), ...respostas]);
}

export function sessaoDto(sufixo = '1', email = 'ana@exemplo.com') {
  return {
    sucesso: true,
    dados: {
      tokenAcesso: `acesso-${sufixo}`,
      tokenRenovacao: `renovacao-${sufixo}`,
      expiraEmSegundos: 900,
      conta: { nome: 'Ana Souza', email, admin: false },
    },
  };
}

export function instalarApiFalsa() {
  filas.clear();
  chamadas.length = 0;
  process.env.EXPO_PUBLIC_API_URL = URL_API;
  global.fetch = jest.fn(async (url: RequestInfo | URL, init: RequestInit = {}) => {
    const caminho = String(url).replace(URL_API, '');
    chamadas.push({ caminho, init });
    const fila = filas.get(caminho) ?? [];
    const proxima = fila.length > 1 ? fila.shift() : fila[0];
    const resolvida = typeof proxima === 'function' ? proxima(init) : proxima;
    if (resolvida === undefined || resolvida === 'falha')
      throw new TypeError('Network request failed');
    return {
      status: resolvida.status,
      ok: resolvida.status >= 200 && resolvida.status < 300,
      text: async () => (resolvida.corpo === undefined ? '' : JSON.stringify(resolvida.corpo)),
    } as Response;
  }) as typeof fetch;
}

export const cabecalho = (indice: number, nome: string) =>
  (chamadas[indice].init.headers as Record<string, string> | undefined)?.[nome];
