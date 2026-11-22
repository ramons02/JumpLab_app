import type { PacienteNaLista, Perfil } from '@/types/patient';
import { filtrarPacientes } from '@/utils/filtroPacientes';

function paciente(nome: string, perfil: Perfil = 'corredor'): PacienteNaLista {
  return {
    id: nome,
    nome,
    dataNascimento: '1990-01-01',
    perfil,
    pernaLesionada: perfil === 'pos_lca' ? 'direita' : 'nenhuma',
    dataLesao: perfil === 'pos_lca' ? '2026-01-10' : null,
    criadoEm: '2026-11-22T12:00:00.000Z',
    atualizadoEm: '2026-11-22T12:00:00.000Z',
    ultimaAvaliacaoEm: null,
  };
}

const nomes = (lista: PacienteNaLista[]) => lista.map((p) => p.nome);

describe('filtrarPacientes', () => {
  describe('ordenação', () => {
    it('ordena por nome sem diferenciar maiúsculas nem acentos', () => {
      const lista = [paciente('Bruno'), paciente('álvaro'), paciente('Carla')];
      expect(nomes(filtrarPacientes(lista, 'todos', ''))).toEqual(['álvaro', 'Bruno', 'Carla']);
    });

    it('não altera a lista recebida', () => {
      const lista = [paciente('Bruno'), paciente('álvaro')];
      filtrarPacientes(lista, 'todos', '');
      expect(nomes(lista)).toEqual(['Bruno', 'álvaro']);
    });
  });

  describe('filtro de perfil e busca', () => {
    const lista = [
      paciente('Ana Souza', 'pos_lca'),
      paciente('Mônica Araújo', 'corredor'),
      paciente('João Lima', 'corredor'),
      paciente('Joana Dias', 'pos_lca'),
    ];

    it('"corredor" mantém só corredores', () => {
      expect(nomes(filtrarPacientes(lista, 'corredor', ''))).toEqual([
        'João Lima',
        'Mônica Araújo',
      ]);
    });

    it('"pos_lca" mantém só Pós-LCA', () => {
      expect(nomes(filtrarPacientes(lista, 'pos_lca', ''))).toEqual(['Ana Souza', 'Joana Dias']);
    });

    it('busca sem acento acha nome com acento', () => {
      expect(nomes(filtrarPacientes(lista, 'todos', 'monica'))).toEqual(['Mônica Araújo']);
    });

    it('busca acha o texto no meio do nome', () => {
      expect(nomes(filtrarPacientes(lista, 'todos', 'souza'))).toEqual(['Ana Souza']);
    });

    it('ignora espaços nas pontas e maiúsculas da busca', () => {
      expect(filtrarPacientes(lista, 'todos', '  ANA  ')).toEqual(
        filtrarPacientes(lista, 'todos', 'ana'),
      );
    });

    it('busca só com espaços mantém todos', () => {
      expect(filtrarPacientes(lista, 'todos', '   ')).toHaveLength(4);
    });

    it('filtro e busca valem juntos', () => {
      expect(nomes(filtrarPacientes(lista, 'pos_lca', 'ana'))).toEqual(['Ana Souza', 'Joana Dias']);
      expect(nomes(filtrarPacientes(lista, 'corredor', 'joao'))).toEqual(['João Lima']);
    });
  });
});
