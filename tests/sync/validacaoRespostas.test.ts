import {
  lerMensagemErro,
  lerPedidos,
  lerRespostaSessao,
  lerSenhaTemporariaGerada,
  RespostaInvalidaError,
} from '@/sync/validacaoRespostas';

import { sessaoDto } from '../helpers/apiFalsa';

describe('lerRespostaSessao', () => {
  it('resposta válida vira a sessão', () => {
    expect(lerRespostaSessao(sessaoDto())).toEqual({
      tokenAcesso: 'acesso-1',
      tokenRenovacao: 'renovacao-1',
      conta: {
        nome: 'Ana Souza',
        email: 'ana@exemplo.com',
        admin: false,
        trocaSenhaObrigatoria: false,
      },
    });
  });

  it('lê a troca obrigatória da senha (spec 016); ausente vira falso', () => {
    const base = sessaoDto();
    const comTroca = lerRespostaSessao({
      ...base,
      dados: { ...base.dados, trocaSenhaObrigatoria: true },
    });
    expect(comTroca.conta.trocaSenhaObrigatoria).toBe(true);
    expect(lerRespostaSessao(base).conta.trocaSenhaObrigatoria).toBe(false);
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

describe('respostas da recuperação de senha (spec 016)', () => {
  const pedido = {
    id: 12,
    email: 'maria@exemplo.com',
    pedidoEm: '2026-11-22T13:40:00Z',
    status: 'aberto',
    atendidoEm: null,
  };

  it('lerPedidos aceita a lista e recusa status ou campo fora do formato', () => {
    expect(lerPedidos({ dados: [pedido] })).toEqual([pedido]);
    expect(lerPedidos({ dados: [] })).toEqual([]);
    expect(() => lerPedidos({ dados: [{ ...pedido, status: 'outro' }] })).toThrow(
      RespostaInvalidaError,
    );
    expect(() => lerPedidos({ dados: [{ ...pedido, id: '12' }] })).toThrow(RespostaInvalidaError);
    expect(() => lerPedidos({ dados: null })).toThrow(RespostaInvalidaError);
  });

  it('lerSenhaTemporariaGerada confere o formato XXXX-XXXX', () => {
    const gerada = {
      pedidoId: 12,
      email: 'maria@exemplo.com',
      senhaTemporaria: 'K7QM-3WZP',
      validaAte: '2026-11-23T13:45:00Z',
    };
    expect(lerSenhaTemporariaGerada({ dados: gerada })).toEqual(gerada);
    expect(() =>
      lerSenhaTemporariaGerada({ dados: { ...gerada, senhaTemporaria: 'k7qm3wzp' } }),
    ).toThrow(RespostaInvalidaError);
    expect(() =>
      lerSenhaTemporariaGerada({ dados: { ...gerada, senhaTemporaria: 'O1IL-0000' } }),
    ).toThrow(RespostaInvalidaError);
  });
});
