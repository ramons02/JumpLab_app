import { gravarSessao, lerSessao } from '@/sync/armazenamentoSessao';
import {
  aoEncerrarSessao,
  chamarApi,
  TEMPO_LIMITE_ACORDAR_MS,
  TEMPO_LIMITE_MS,
} from '@/sync/clienteHttp';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { cabecalho, chamadas, instalarApiFalsa, responder, sessaoDto } from '../helpers/apiFalsa';

const SESSAO = {
  tokenAcesso: 'acesso-0',
  tokenRenovacao: 'renovacao-0',
  conta: {
    nome: 'Ana Souza',
    email: 'ana@exemplo.com',
    admin: false,
    trocaSenhaObrigatoria: false,
  },
};
const lerTudo = (corpo: unknown) => corpo;

describe('chamarApi', () => {
  beforeEach(async () => {
    limparArmazenamentoSeguro();
    instalarApiFalsa();
    await gravarSessao(SESSAO);
  });

  it('chamada autenticada leva o Bearer', async () => {
    responder('/api/protegida', { status: 200, corpo: { sucesso: true, dados: 1 } });
    const r = await chamarApi('/api/protegida', { metodo: 'GET', autenticada: true }, lerTudo);
    expect(r).toEqual({ tipo: 'ok', dados: { sucesso: true, dados: 1 } });
    expect(cabecalho(0, 'Authorization')).toBe('Bearer acesso-0');
  });

  it('chamada pública não leva token', async () => {
    responder('/api/auth/entrar', { status: 200, corpo: {} });
    await chamarApi('/api/auth/entrar', { metodo: 'POST', corpo: {}, autenticada: false }, lerTudo);
    expect(cabecalho(0, 'Authorization')).toBeUndefined();
  });

  it('401 renova uma vez, grava a sessão nova e repete', async () => {
    responder('/api/protegida', { status: 401 }, { status: 200, corpo: { ok: 1 } });
    responder('/api/auth/renovar', { status: 200, corpo: sessaoDto('2') });

    const r = await chamarApi('/api/protegida', { metodo: 'GET', autenticada: true }, lerTudo);

    expect(r.tipo).toBe('ok');
    expect(chamadas.map((c) => c.caminho)).toEqual([
      '/api/protegida',
      '/api/auth/renovar',
      '/api/protegida',
    ]);
    expect(JSON.parse(String(chamadas[1].init.body))).toEqual({ tokenRenovacao: 'renovacao-0' });
    expect(cabecalho(2, 'Authorization')).toBe('Bearer acesso-2');
    expect((await lerSessao())?.tokenRenovacao).toBe('renovacao-2');
  });

  it('duas chamadas com 401 ao mesmo tempo fazem uma só renovação', async () => {
    responder('/api/a', { status: 401 }, { status: 200, corpo: {} });
    responder('/api/b', { status: 401 }, { status: 200, corpo: {} });
    responder('/api/auth/renovar', { status: 200, corpo: sessaoDto('2') });

    const [a, b] = await Promise.all([
      chamarApi('/api/a', { metodo: 'GET', autenticada: true }, lerTudo),
      chamarApi('/api/b', { metodo: 'GET', autenticada: true }, lerTudo),
    ]);

    expect([a.tipo, b.tipo]).toEqual(['ok', 'ok']);
    expect(chamadas.filter((c) => c.caminho === '/api/auth/renovar')).toHaveLength(1);
  });

  it('renovação recusada apaga a sessão, avisa e devolve sessao-encerrada', async () => {
    const ouvinte = jest.fn();
    const sair = aoEncerrarSessao(ouvinte);
    responder('/api/protegida', { status: 401 });
    responder('/api/auth/renovar', {
      status: 401,
      corpo: { sucesso: false, mensagem: 'Sessão inválida ou expirada.' },
    });

    const r = await chamarApi('/api/protegida', { metodo: 'GET', autenticada: true }, lerTudo);

    expect(r).toEqual({ tipo: 'sessao-encerrada' });
    expect(await lerSessao()).toBeNull();
    expect(ouvinte).toHaveBeenCalledTimes(1);
    sair();
  });

  it('sem sessão, chamada autenticada devolve sessao-encerrada sem ir à rede', async () => {
    limparArmazenamentoSeguro();
    const r = await chamarApi('/api/protegida', { metodo: 'GET', autenticada: true }, lerTudo);
    expect(r).toEqual({ tipo: 'sessao-encerrada' });
    expect(chamadas).toHaveLength(0);
  });

  it('falha de rede devolve sem-conexao e mantém a sessão', async () => {
    responder('/api/protegida', 'falha');
    const r = await chamarApi('/api/protegida', { metodo: 'GET', autenticada: true }, lerTudo);
    expect(r).toEqual({ tipo: 'sem-conexao' });
    expect(await lerSessao()).toEqual(SESSAO);
  });

  it('tempo esgotado devolve sem-conexao', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    global.fetch = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, rejeitar) => {
          init?.signal?.addEventListener('abort', () => rejeitar(new Error('aborted')));
        }),
    ) as typeof fetch;

    const resultado = chamarApi('/api/lenta', { metodo: 'GET', autenticada: false }, lerTudo);
    await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_MS);

    expect(await resultado).toEqual({ tipo: 'sem-conexao' });
    jest.useRealTimers();
  });

  it('com a espera de acordar, resposta depois de 15 s ainda chega; depois de 75 s, sem-conexao', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    const lenta = (atrasoMs: number) =>
      jest.fn(
        (_url: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((resolver, rejeitar) => {
            const t = setTimeout(
              () => resolver(new Response(JSON.stringify({ sucesso: true }), { status: 200 })),
              atrasoMs,
            );
            init?.signal?.addEventListener('abort', () => {
              clearTimeout(t);
              rejeitar(new Error('aborted'));
            });
          }),
      ) as typeof fetch;
    const opcoes = {
      metodo: 'POST' as const,
      autenticada: false,
      tempoLimiteMs: TEMPO_LIMITE_ACORDAR_MS,
    };

    global.fetch = lenta(40_000);
    const acordou = chamarApi('/api/auth/entrar', opcoes, lerTudo);
    await jest.advanceTimersByTimeAsync(40_000);
    expect(await acordou).toEqual({ tipo: 'ok', dados: { sucesso: true } });

    global.fetch = lenta(TEMPO_LIMITE_ACORDAR_MS + 5_000);
    const dormindo = chamarApi('/api/auth/entrar', opcoes, lerTudo);
    await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_ACORDAR_MS);
    expect(await dormindo).toEqual({ tipo: 'sem-conexao' });
    jest.useRealTimers();
  });

  it('erro da API vira a mensagem do envelope; resposta fora do formato vira erro', async () => {
    responder('/api/auth/entrar', {
      status: 401,
      corpo: { sucesso: false, mensagem: 'E-mail ou senha inválidos.' },
    });
    expect(
      await chamarApi(
        '/api/auth/entrar',
        { metodo: 'POST', corpo: {}, autenticada: false },
        lerTudo,
      ),
    ).toEqual({ tipo: 'erro', status: 401, mensagem: 'E-mail ou senha inválidos.' });

    responder('/api/x', { status: 200, corpo: {} });
    const r = await chamarApi('/api/x', { metodo: 'GET', autenticada: false }, () => {
      throw new Error('formato');
    });
    expect(r).toMatchObject({ tipo: 'erro', status: 200 });
  });

  it('nenhum token aparece no console', async () => {
    const espioes = (['log', 'warn', 'error', 'info'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => {}),
    );
    responder('/api/protegida', { status: 401 }, { status: 200, corpo: {} });
    responder('/api/auth/renovar', { status: 200, corpo: sessaoDto('2') });
    await chamarApi('/api/protegida', { metodo: 'GET', autenticada: true }, lerTudo);

    const escrito = espioes.flatMap((e) => e.mock.calls.flat().map(String)).join(' ');
    expect(escrito).not.toMatch(/acesso-|renovacao-/);
    espioes.forEach((e) => e.mockRestore());
  });
});
