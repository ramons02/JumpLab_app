import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import { listarPacientes } from '@/database/pacientes';
import { calcularIdade, hojeIso, paraBr } from '@/utils/datas';

import { abrirApp, bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

function amanha() {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  return paraBr(data.toISOString().slice(0, 10));
}

async function abrirCadastro() {
  await abrirApp('/');
  await screen.findByText('Nenhum paciente cadastrado ainda.');
  await fireEvent.press(screen.getByText('+ Novo Paciente'));
  await screen.findByLabelText('Nome');
}

async function preencherAnaSouza() {
  await fireEvent.changeText(screen.getByLabelText('Nome'), 'Ana Souza');
  await fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '15031995');
  await fireEvent.press(screen.getByRole('radio', { name: 'Pós-LCA' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Direita' }));
  await fireEvent.changeText(screen.getByLabelText('Data da cirurgia'), '10082026');
}

describe('tela de cadastro de paciente', () => {
  beforeEach(async () => {
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.restoreAllMocks();
  });

  it('salva um paciente válido e volta para a lista com ele', async () => {
    await abrirCadastro();
    await preencherAnaSouza();

    await fireEvent.press(screen.getByText('Salvar'));

    expect(await screen.findByText('Ana Souza')).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    const idade = calcularIdade('1995-03-15', hojeIso());
    expect(screen.getByText(`Pós-LCA · ${idade} anos`)).toBeOnTheScreen();
    expect(await listarPacientes(bancoDaTela())).toHaveLength(1);
  });

  it('mostra a idade ao digitar a data de nascimento', async () => {
    await abrirCadastro();
    await fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '15031995');
    expect(screen.getByText(`${calcularIdade('1995-03-15', hojeIso())} anos`)).toBeOnTheScreen();
  });

  it('nome vazio mostra a mensagem no campo e não grava', async () => {
    await abrirCadastro();
    await preencherAnaSouza();
    await fireEvent.changeText(screen.getByLabelText('Nome'), '   ');

    await fireEvent.press(screen.getByText('Salvar'));

    expect(await screen.findByText('Informe o nome (mínimo 2 letras).')).toBeOnTheScreen();
    expect(await listarPacientes(bancoDaTela())).toHaveLength(0);
  });

  it('Pós-LCA com perna Nenhuma pede Direita ou Esquerda', async () => {
    await abrirCadastro();
    await preencherAnaSouza();
    await fireEvent.press(screen.getByRole('radio', { name: 'Nenhuma' }));

    await fireEvent.press(screen.getByText('Salvar'));

    expect(await screen.findByText('Para Pós-LCA, escolha Direita ou Esquerda.')).toBeOnTheScreen();
    expect(await listarPacientes(bancoDaTela())).toHaveLength(0);
  });

  it('recusa data da cirurgia futura', async () => {
    await abrirCadastro();
    await preencherAnaSouza();
    await fireEvent.changeText(screen.getByLabelText('Data da cirurgia'), amanha());

    await fireEvent.press(screen.getByText('Salvar'));

    expect(await screen.findByText('A data não pode ser futura.')).toBeOnTheScreen();
    expect(await listarPacientes(bancoDaTela())).toHaveLength(0);
  });

  it('sair com dados digitados pede confirmação', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const resultado = await abrirApp('/');
    await screen.findByText('Nenhum paciente cadastrado ainda.');
    await fireEvent.press(screen.getByText('+ Novo Paciente'));
    await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Ana');

    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.back();
    });

    await waitFor(() =>
      expect(alerta).toHaveBeenCalledWith(
        'Descartar alterações?',
        'Os dados digitados ainda não foram salvos.',
        expect.any(Array),
      ),
    );
    expect(resultado.getPathname()).toBe('/patient/new');
  });
});
