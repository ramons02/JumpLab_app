import { act, renderHook } from '@testing-library/react-native';

import { salvarAvaliacao } from '@/database/avaliacoes';
import { inserirPaciente } from '@/database/pacientes';
import { useLaudoPdf } from '@/hooks/useLaudoPdf';
import { montarResumoSalto } from '@/utils/resumoAvaliacao';

import { CMJ_BILATERAL, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { laudo, reiniciarLaudo } from '../helpers/mocksLaudo';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('expo-print', () => require('../helpers/mocksLaudo').moduloPrint);
jest.mock('expo-sharing', () => require('../helpers/mocksLaudo').moduloSharing);

async function avaliacaoGravada() {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: 'corredor',
    pernaLesionada: 'nenhuma',
    dataLesao: null,
  });
  const nova = novaAvaliacao(paciente.id, 'cmj_bi', CMJ_BILATERAL, { pernaLesionada: 'nenhuma' });
  return salvarAvaliacao(bancoDaTela(), nova, montarResumoSalto(nova), '');
}

describe('useLaudoPdf', () => {
  beforeEach(async () => {
    reiniciarLaudo();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('dois pedidos ao mesmo tempo geram um PDF só (FR-013)', async () => {
    const salva = await avaliacaoGravada();
    const { result } = await renderHook(() => useLaudoPdf());

    let resultados: (string | null)[] = [];
    await act(async () => {
      resultados = await Promise.all([
        result.current.gerarECompartilhar(salva.id),
        result.current.gerarECompartilhar(salva.id),
      ]);
    });

    expect(resultados).toEqual(['compartilhado', null]);
    expect(laudo.htmls).toHaveLength(1);
  });

  it('sem folha de compartilhamento no aparelho devolve erro', async () => {
    laudo.compartilhamentoDisponivel = false;
    const salva = await avaliacaoGravada();
    const { result } = await renderHook(() => useLaudoPdf());

    let resultado: string | null = null;
    await act(async () => {
      resultado = await result.current.gerarECompartilhar(salva.id);
    });
    expect(resultado).toBe('erro');
  });

  it('avaliação inexistente devolve erro sem lançar', async () => {
    const { result } = await renderHook(() => useLaudoPdf());
    let resultado: string | null = null;
    await act(async () => {
      resultado = await result.current.gerarECompartilhar('nao-existe');
    });
    expect(resultado).toBe('erro');
  });
});
