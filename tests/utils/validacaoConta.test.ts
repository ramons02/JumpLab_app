import {
  MENSAGENS_CONTA,
  normalizarEmail,
  validarCriarConta,
  validarEntrar,
  validarSenhaNova,
} from '@/utils/validacaoConta';

const VALIDOS = {
  nome: 'Ana Souza',
  email: 'ana@exemplo.com',
  senha: 'segredo1',
  confirmacao: 'segredo1',
};

describe('validarCriarConta', () => {
  it('dados válidos não têm erro (senha com 8 exatos)', () => {
    expect(validarCriarConta(VALIDOS)).toEqual({});
  });

  it.each([
    [{ nome: 'A' }, 'nome', MENSAGENS_CONTA.nome],
    [{ nome: '  ' }, 'nome', MENSAGENS_CONTA.nome],
    [{ nome: 'a'.repeat(121) }, 'nome', MENSAGENS_CONTA.nomeLongo],
    [{ email: 'ana@' }, 'email', MENSAGENS_CONTA.email],
    [{ email: `${'a'.repeat(250)}@x.com` }, 'email', MENSAGENS_CONTA.email],
    [{ senha: 'curta12', confirmacao: 'curta12' }, 'senha', MENSAGENS_CONTA.senhaCurta],
    [{ senha: 'é'.repeat(37), confirmacao: 'é'.repeat(37) }, 'senha', MENSAGENS_CONTA.senhaLonga],
    [{ confirmacao: 'outra123' }, 'confirmacao', MENSAGENS_CONTA.confirmacao],
  ] as const)('%p dá erro em %s', (mudanca, campo, mensagem) => {
    expect(validarCriarConta({ ...VALIDOS, ...mudanca })[campo]).toBe(mensagem);
  });
});

describe('validarEntrar e normalizarEmail', () => {
  it('só exige e-mail e senha preenchidos', () => {
    expect(validarEntrar('ana@exemplo.com', 'x')).toEqual({});
    expect(validarEntrar('  ', '')).toEqual({
      email: MENSAGENS_CONTA.email,
      senha: MENSAGENS_CONTA.senhaVazia,
    });
  });

  it('normaliza o e-mail', () => {
    expect(normalizarEmail('  Ana@Exemplo.COM ')).toBe('ana@exemplo.com');
  });
});

describe('validarSenhaNova (spec 016)', () => {
  it('7 caracteres recusa, 8 aceita, confirmação diferente recusa', () => {
    expect(validarSenhaNova('1234567', '1234567')).toEqual({
      senha: 'A senha precisa ter pelo menos 8 caracteres.',
    });
    expect(validarSenhaNova('12345678', '12345678')).toEqual({});
    expect(validarSenhaNova('12345678', '12345679')).toEqual({
      confirmacao: 'As senhas não conferem.',
    });
  });
});
