import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import { buscarPaciente, inserirPaciente } from '@/database/pacientes';
import type { Patient } from '@/types/patient';

import { abrirApp, bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

async function cadastrarBruno(): Promise<Patient> {
  return inserirPaciente(bancoDaTela(), {
    nome: 'Bruno Lima',
    dataNascimento: '1988-07-02',
    perfil: 'corredor',
    pernaLesionada: 'nenhuma',
    dataLesao: null,
  });
}

describe('tela de edição de paciente', () => {
  beforeEach(async () => {
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.restoreAllMocks();
  });

  it('abre preenchida com os dados do paciente', async () => {
    const bruno = await cadastrarBruno();
    await abrirApp(`/patient/${bruno.id}/edit`);

    expect(await screen.findByDisplayValue('Bruno Lima')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('02/07/1988')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Corredor' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Nenhuma' })).toBeChecked();
  });

  it('trocar o nome e salvar grava no mesmo paciente', async () => {
    const bruno = await cadastrarBruno();
    await abrirApp('/');
    await screen.findByText('Bruno Lima');
    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.push(`/patient/${bruno.id}/edit`);
    });
    await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Bruno Lima Souza');

    await fireEvent.press(screen.getByText('Salvar'));

    expect(await screen.findByText('Bruno Lima Souza')).toBeOnTheScreen();
    const salvo = await buscarPaciente(bancoDaTela(), bruno.id);
    expect(salvo?.nome).toBe('Bruno Lima Souza');
    expect(salvo?.criadoEm).toBe(bruno.criadoEm);
  });

  it('Corredor que vira Pós-LCA sem perna nem data é recusado', async () => {
    const bruno = await cadastrarBruno();
    await abrirApp(`/patient/${bruno.id}/edit`);
    await screen.findByDisplayValue('Bruno Lima');

    await fireEvent.press(screen.getByRole('radio', { name: 'Pós-LCA' }));
    await fireEvent.press(screen.getByText('Salvar'));

    expect(await screen.findByText('Para Pós-LCA, escolha Direita ou Esquerda.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a data da cirurgia.')).toBeOnTheScreen();
    expect((await buscarPaciente(bancoDaTela(), bruno.id))?.perfil).toBe('corredor');
  });

  it('id inexistente mostra a mensagem e oferece voltar', async () => {
    await abrirApp('/patient/7f1d2c1e-8b0a-4c55-9a3e-2b7f9d0c1a11/edit');

    expect(await screen.findByText('Paciente não encontrado.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeOnTheScreen();
  });

  it('id que não é UUID também mostra a mensagem', async () => {
    await abrirApp('/patient/abc/edit');
    expect(await screen.findByText('Paciente não encontrado.')).toBeOnTheScreen();
  });

  it('sair com alteração não salva pede confirmação', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const bruno = await cadastrarBruno();
    const resultado = await abrirApp('/');
    await screen.findByText('Bruno Lima');
    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.push(`/patient/${bruno.id}/edit`);
    });
    await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Outro nome');

    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.back();
    });

    await waitFor(() =>
      expect(alerta).toHaveBeenCalledWith(
        'Descartar alterações?',
        expect.any(String),
        expect.any(Array),
      ),
    );
    expect(resultado.getPathname()).toBe(`/patient/${bruno.id}/edit`);
  });

  it('sair sem alterar não pede confirmação', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const bruno = await cadastrarBruno();
    const resultado = await abrirApp('/');
    await screen.findByText('Bruno Lima');
    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.push(`/patient/${bruno.id}/edit`);
    });
    await screen.findByDisplayValue('Bruno Lima');

    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.back();
    });

    await waitFor(() => expect(resultado.getPathname()).toBe('/'));
    expect(alerta).not.toHaveBeenCalled();
  });
});
