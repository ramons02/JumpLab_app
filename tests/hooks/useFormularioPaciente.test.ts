import { act, renderHook } from '@testing-library/react-native';

import { useFormularioPaciente } from '@/hooks/useFormularioPaciente';
import type { DadosPaciente, Patient } from '@/types/patient';

async function preencher(mudar: ReturnType<typeof useFormularioPaciente>['mudar']) {
  await act(async () => {
    mudar('nome', 'Ana Souza');
    mudar('dataNascimento', '15/03/1995');
    mudar('perfil', 'pos_lca');
    mudar('pernaLesionada', 'direita');
    mudar('dataLesao', '10/08/2026');
  });
}

describe('useFormularioPaciente', () => {
  it('toque duplo em Salvar grava uma única vez', async () => {
    const gravar = jest.fn<Promise<void>, [DadosPaciente]>(() => Promise.resolve());
    const { result } = await renderHook(() => useFormularioPaciente(gravar));
    await preencher(result.current.mudar);

    let resultados: boolean[] = [];
    await act(async () => {
      resultados = await Promise.all([result.current.salvar(), result.current.salvar()]);
    });

    expect(gravar).toHaveBeenCalledTimes(1);
    expect(resultados.sort()).toEqual([false, true]);
  });

  it('entrega os dados convertidos: datas ISO e nome sem espaços nas pontas', async () => {
    const gravar = jest.fn<Promise<void>, [DadosPaciente]>(() => Promise.resolve());
    const { result } = await renderHook(() => useFormularioPaciente(gravar));
    await preencher(result.current.mudar);
    await act(async () => {
      result.current.mudar('nome', '  Ana Souza  ');
    });

    await act(async () => {
      await result.current.salvar();
    });

    expect(gravar).toHaveBeenCalledWith({
      nome: 'Ana Souza',
      dataNascimento: '1995-03-15',
      perfil: 'pos_lca',
      pernaLesionada: 'direita',
      dataLesao: '2026-08-10',
    });
    expect(result.current.alterado).toBe(false);
  });

  it('não grava com erro de validação e marca o campo', async () => {
    const gravar = jest.fn<Promise<void>, [DadosPaciente]>(() => Promise.resolve());
    const { result } = await renderHook(() => useFormularioPaciente(gravar));

    await act(async () => {
      await result.current.salvar();
    });

    expect(gravar).not.toHaveBeenCalled();
    expect(result.current.erros.nome).toBe('Informe o nome (mínimo 2 letras).');
  });

  it('libera o Salvar de novo quando a gravação falha', async () => {
    const gravar = jest.fn<Promise<void>, [DadosPaciente]>(() =>
      Promise.reject(new Error('disco cheio')),
    );
    const { result } = await renderHook(() => useFormularioPaciente(gravar));
    await preencher(result.current.mudar);

    await act(async () => {
      await expect(result.current.salvar()).rejects.toThrow('disco cheio');
    });

    expect(result.current.salvando).toBe(false);
    expect(result.current.alterado).toBe(true);
  });

  it('abre preenchido com o paciente inicial, sem alteração pendente', async () => {
    const paciente: Patient = {
      id: '7f1d2c1e-8b0a-4c55-9a3e-2b7f9d0c1a11',
      nome: 'Bruno Lima',
      dataNascimento: '1988-07-02',
      perfil: 'corredor',
      pernaLesionada: 'nenhuma',
      dataLesao: null,
      criadoEm: '2026-11-01T10:00:00.000Z',
      atualizadoEm: '2026-11-01T10:00:00.000Z',
    };
    const { result } = await renderHook(() => useFormularioPaciente(jest.fn(), paciente));

    expect(result.current.valores).toEqual({
      nome: 'Bruno Lima',
      dataNascimento: '02/07/1988',
      perfil: 'corredor',
      pernaLesionada: 'nenhuma',
      dataLesao: '',
    });
    expect(result.current.alterado).toBe(false);
  });
});
