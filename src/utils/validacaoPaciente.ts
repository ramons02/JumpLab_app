import type { DadosPaciente, DadosPacienteFormulario, ErrosPaciente } from '@/types/patient';
import { calcularIdade, paraIso } from '@/utils/datas';

const NOME_MINIMO = 2;
const IDADE_MINIMA = 1;
const IDADE_MAXIMA = 120;

export const MENSAGENS = {
  nome: 'Informe o nome (mínimo 2 letras).',
  dataInvalida: 'Informe uma data válida (dd/mm/aaaa).',
  idadeForaDaFaixa: 'A idade precisa estar entre 1 e 120 anos.',
  perfil: 'Escolha o perfil.',
  perna: 'Escolha a perna lesionada.',
  pernaPosLca: 'Para Pós-LCA, escolha Direita ou Esquerda.',
  dataCirurgia: 'Informe a data da cirurgia.',
  dataFutura: 'A data não pode ser futura.',
  dataAntesDoNascimento: 'A data não pode ser anterior ao nascimento.',
} as const;

/** Devolve as mensagens por campo; objeto vazio significa válido. `hoje` em AAAA-MM-DD. */
export function validarPaciente(dados: DadosPacienteFormulario, hoje: string): ErrosPaciente {
  const erros: ErrosPaciente = {};

  if (dados.nome.trim().length < NOME_MINIMO) erros.nome = MENSAGENS.nome;

  const nascimento = paraIso(dados.dataNascimento);
  if (!nascimento) {
    erros.dataNascimento = MENSAGENS.dataInvalida;
  } else {
    const idade = calcularIdade(nascimento, hoje);
    if (nascimento > hoje || idade < IDADE_MINIMA || idade > IDADE_MAXIMA) {
      erros.dataNascimento = MENSAGENS.idadeForaDaFaixa;
    }
  }

  if (!dados.perfil) erros.perfil = MENSAGENS.perfil;

  if (!dados.pernaLesionada) erros.pernaLesionada = MENSAGENS.perna;
  else if (dados.perfil === 'pos_lca' && dados.pernaLesionada === 'nenhuma') {
    erros.pernaLesionada = MENSAGENS.pernaPosLca;
  }

  const erroLesao = validarDataLesao(dados, nascimento, hoje);
  if (erroLesao) erros.dataLesao = erroLesao;

  return erros;
}

function validarDataLesao(
  dados: DadosPacienteFormulario,
  nascimento: string | null,
  hoje: string,
): string | undefined {
  if (!dados.dataLesao) {
    return dados.perfil === 'pos_lca' ? MENSAGENS.dataCirurgia : undefined;
  }
  const lesao = paraIso(dados.dataLesao);
  if (!lesao) return MENSAGENS.dataInvalida;
  if (lesao > hoje) return MENSAGENS.dataFutura;
  if (nascimento && lesao < nascimento) return MENSAGENS.dataAntesDoNascimento;
  return undefined;
}

/** Converte o formulário já validado nos dados gravados (datas ISO, nome sem espaços nas pontas). */
export function paraDadosPaciente(dados: DadosPacienteFormulario): DadosPaciente {
  const nascimento = paraIso(dados.dataNascimento);
  if (!nascimento || !dados.perfil || !dados.pernaLesionada) {
    throw new Error('Formulário de paciente inválido: valide antes de converter.');
  }
  return {
    nome: dados.nome.trim(),
    dataNascimento: nascimento,
    perfil: dados.perfil,
    pernaLesionada: dados.pernaLesionada,
    dataLesao: dados.dataLesao ? paraIso(dados.dataLesao) : null,
  };
}
