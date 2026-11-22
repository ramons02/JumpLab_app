import type { DadosPacienteFormulario } from '@/types/patient';
import { validarPaciente } from '@/utils/validacaoPaciente';

const HOJE = '2026-11-22';

const posLcaValido: DadosPacienteFormulario = {
  nome: 'Ana Souza',
  dataNascimento: '15/03/1995',
  perfil: 'pos_lca',
  pernaLesionada: 'direita',
  dataLesao: '10/08/2026',
};

const corredorValido: DadosPacienteFormulario = {
  nome: 'Bruno Lima',
  dataNascimento: '02/07/1988',
  perfil: 'corredor',
  pernaLesionada: 'nenhuma',
  dataLesao: '',
};

function validar(alteracoes: Partial<DadosPacienteFormulario>, base = posLcaValido) {
  return validarPaciente({ ...base, ...alteracoes }, HOJE);
}

describe('validarPaciente', () => {
  it('aceita um Pós-LCA completo', () => {
    expect(validar({})).toEqual({});
  });

  it('aceita um Corredor sem perna lesionada e sem data da lesão', () => {
    expect(validar({}, corredorValido)).toEqual({});
  });

  it('aceita um Corredor com data da lesão', () => {
    expect(
      validar({ pernaLesionada: 'esquerda', dataLesao: '01/01/2026' }, corredorValido),
    ).toEqual({});
  });

  describe('nome', () => {
    it.each(['', '   ', 'A', ' A '])('recusa "%s"', (nome) => {
      expect(validar({ nome }).nome).toBe('Informe o nome (mínimo 2 letras).');
    });

    it('conta os caracteres depois de tirar os espaços das pontas', () => {
      expect(validar({ nome: ' Al ' }).nome).toBeUndefined();
    });
  });

  describe('data de nascimento', () => {
    it.each(['', '15/03', '31/02/2000'])('recusa data vazia ou inválida "%s"', (dataNascimento) => {
      expect(validar({ dataNascimento }).dataNascimento).toBe(
        'Informe uma data válida (dd/mm/aaaa).',
      );
    });

    it.each([
      ['futura', '23/11/2026'],
      ['com menos de 1 ano', '23/11/2025'],
      ['com mais de 120 anos', '21/11/1905'],
    ])('recusa idade fora de 1 a 120 (%s)', (_caso, dataNascimento) => {
      expect(validar({ dataNascimento, dataLesao: '' }, corredorValido).dataNascimento).toBe(
        'A idade precisa estar entre 1 e 120 anos.',
      );
    });

    it('aceita exatamente 1 e 120 anos', () => {
      expect(validar({ dataNascimento: '22/11/2025', dataLesao: '' }, corredorValido)).toEqual({});
      expect(validar({ dataNascimento: '22/11/1906', dataLesao: '' }, corredorValido)).toEqual({});
    });
  });

  it('exige o perfil', () => {
    expect(validar({ perfil: '' }).perfil).toBe('Escolha o perfil.');
  });

  it('exige a perna lesionada', () => {
    expect(validar({ pernaLesionada: '' }).pernaLesionada).toBe('Escolha a perna lesionada.');
  });

  it('Pós-LCA não aceita perna Nenhuma', () => {
    expect(validar({ pernaLesionada: 'nenhuma' }).pernaLesionada).toBe(
      'Para Pós-LCA, escolha Direita ou Esquerda.',
    );
  });

  it('Pós-LCA exige a data da cirurgia', () => {
    expect(validar({ dataLesao: '' }).dataLesao).toBe('Informe a data da cirurgia.');
  });

  it('recusa data da cirurgia ou lesão inválida', () => {
    expect(validar({ dataLesao: '31/02/2026' }).dataLesao).toBe(
      'Informe uma data válida (dd/mm/aaaa).',
    );
  });

  it('recusa data da cirurgia ou lesão futura', () => {
    expect(validar({ dataLesao: '23/11/2026' }).dataLesao).toBe('A data não pode ser futura.');
    expect(validar({ dataLesao: '23/11/2026' }, corredorValido).dataLesao).toBe(
      'A data não pode ser futura.',
    );
  });

  it('aceita a data da cirurgia igual a hoje', () => {
    expect(validar({ dataLesao: '22/11/2026' })).toEqual({});
  });

  it('recusa data da cirurgia ou lesão anterior ao nascimento', () => {
    expect(validar({ dataLesao: '14/03/1995' }).dataLesao).toBe(
      'A data não pode ser anterior ao nascimento.',
    );
  });

  it('Corredor que vira Pós-LCA sem perna nem data recebe as duas mensagens', () => {
    const erros = validar({ perfil: 'pos_lca' }, corredorValido);
    expect(erros.pernaLesionada).toBe('Para Pós-LCA, escolha Direita ou Esquerda.');
    expect(erros.dataLesao).toBe('Informe a data da cirurgia.');
  });
});
