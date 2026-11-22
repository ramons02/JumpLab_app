import { useCallback, useReducer, useRef } from 'react';

import type {
  DadosPaciente,
  DadosPacienteFormulario,
  ErrosPaciente,
  Patient,
} from '@/types/patient';
import { hojeIso, paraBr } from '@/utils/datas';
import { paraDadosPaciente, validarPaciente } from '@/utils/validacaoPaciente';

type Campo = keyof DadosPacienteFormulario;

interface Estado {
  valores: DadosPacienteFormulario;
  erros: ErrosPaciente;
  salvando: boolean;
  alterado: boolean;
}

type Acao =
  | { tipo: 'mudar'; campo: Campo; valor: string }
  | { tipo: 'erros'; erros: ErrosPaciente }
  | { tipo: 'salvando' }
  | { tipo: 'salvo' }
  | { tipo: 'falhou' };

const VAZIO: DadosPacienteFormulario = {
  nome: '',
  dataNascimento: '',
  perfil: '',
  pernaLesionada: '',
  dataLesao: '',
};

function valoresIniciais(paciente?: Patient): DadosPacienteFormulario {
  if (!paciente) return VAZIO;
  return {
    nome: paciente.nome,
    dataNascimento: paraBr(paciente.dataNascimento),
    perfil: paciente.perfil,
    pernaLesionada: paciente.pernaLesionada,
    dataLesao: paciente.dataLesao ? paraBr(paciente.dataLesao) : '',
  };
}

function reducer(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case 'mudar':
      return {
        ...estado,
        valores: { ...estado.valores, [acao.campo]: acao.valor },
        erros: { ...estado.erros, [acao.campo]: undefined },
        alterado: true,
      };
    case 'erros':
      return { ...estado, erros: acao.erros };
    case 'salvando':
      return { ...estado, salvando: true };
    case 'salvo':
      return { ...estado, salvando: false, alterado: false };
    case 'falhou':
      return { ...estado, salvando: false };
  }
}

/**
 * Estado do formulário de paciente. `gravar` recebe os dados já validados e convertidos;
 * `salvar` devolve true quando gravou.
 */
export function useFormularioPaciente(
  gravar: (dados: DadosPaciente) => Promise<void>,
  pacienteInicial?: Patient,
) {
  const [estado, despachar] = useReducer(reducer, pacienteInicial, (paciente): Estado => ({
    valores: valoresIniciais(paciente),
    erros: {},
    salvando: false,
    alterado: false,
  }));
  // Trava síncrona: dois toques no mesmo quadro chegam antes de o estado `salvando` renderizar.
  const gravando = useRef(false);

  const mudar = useCallback((campo: Campo, valor: string) => {
    despachar({ tipo: 'mudar', campo, valor });
  }, []);

  const salvar = useCallback(async (): Promise<boolean> => {
    if (gravando.current) return false;
    const erros = validarPaciente(estado.valores, hojeIso());
    despachar({ tipo: 'erros', erros });
    if (Object.keys(erros).length > 0) return false;

    gravando.current = true;
    despachar({ tipo: 'salvando' });
    try {
      await gravar(paraDadosPaciente(estado.valores));
      despachar({ tipo: 'salvo' });
      return true;
    } catch (erro) {
      despachar({ tipo: 'falhou' });
      throw erro;
    } finally {
      gravando.current = false;
    }
  }, [estado.valores, gravar]);

  return { ...estado, mudar, salvar };
}
