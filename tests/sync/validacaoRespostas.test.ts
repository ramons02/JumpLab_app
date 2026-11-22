import {
  lerMensagemErro,
  lerRespostaSessao,
  RespostaInvalidaError,
} from '@/sync/validacaoRespostas';

import { sessaoDto } from '../helpers/apiFalsa';

describe('lerRespostaSessao', () => {
  it('resposta válida vira a sessão', () => {
    expect(lerRespostaSessao(sessaoDto())).toEqual({
      tokenAcesso: 'acesso-1',
      tokenRenovacao: 'renovacao-1',
      conta: { nome: 'Ana Souza', email: 'ana@exemplo.com', admin: false },
    });
  });

  it('campo faltando ou de tipo errado lança RespostaInvalidaError', () => {
    const base = sessaoDto();
    expect(() =>
      lerRespostaSessao({ ...base, dados: { ...base.dados, tokenAcesso: undefined } }),
    ).toThrow(RespostaInvalidaError);
    expect(() =>
      lerRespostaSessao({
        ...base,
        dados: { ...base.dados, conta: { ...base.dados.conta, admin: 'não' } },
      }),
    ).toThrow(RespostaInvalidaError);
    expect(() => lerRespostaSessao(null)).toThrow(RespostaInvalidaError);
    expect(() => lerRespostaSessao({ sucesso: true })).toThrow(RespostaInvalidaError);
  });
});

describe('lerMensagemErro', () => {
  it('lê a mensagem do envelope ou devolve null', () => {
    expect(lerMensagemErro({ sucesso: false, mensagem: 'E-mail ou senha inválidos.' })).toBe(
      'E-mail ou senha inválidos.',
    );
    expect(lerMensagemErro({ sucesso: false })).toBeNull();
    expect(lerMensagemErro('texto')).toBeNull();
  });
});
