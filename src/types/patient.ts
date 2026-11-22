export type Perfil = 'pos_lca' | 'corredor';
export type PernaLesionada = 'direita' | 'esquerda' | 'nenhuma';

export interface Patient {
  id: string;
  nome: string;
  /** AAAA-MM-DD */
  dataNascimento: string;
  perfil: Perfil;
  pernaLesionada: PernaLesionada;
  /** AAAA-MM-DD; data da cirurgia (Pós-LCA) ou da lesão (Corredor) */
  dataLesao: string | null;
  /** ISO 8601 UTC */
  criadoEm: string;
  /** ISO 8601 UTC */
  atualizadoEm: string;
}

export type DadosPaciente = Omit<Patient, 'id' | 'criadoEm' | 'atualizadoEm'>;

/** Valores como o avaliador digita: datas em dd/mm/aaaa e escolhas ainda vazias. */
export interface DadosPacienteFormulario {
  nome: string;
  dataNascimento: string;
  perfil: Perfil | '';
  pernaLesionada: PernaLesionada | '';
  dataLesao: string;
}

export type ErrosPaciente = Partial<Record<keyof DadosPacienteFormulario, string>>;

export interface PacienteNaLista extends Patient {
  /** AAAA-MM-DDTHH:MM local; null = "Sem avaliações" */
  ultimaAvaliacaoEm: string | null;
}

export type FiltroPerfil = 'todos' | Perfil;
