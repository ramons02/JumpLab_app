import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Stack } from 'expo-router';
import { Text } from 'react-native';

import TelaPerfilPaciente from '@/app/patient/[id]/index';
import { atualizarPaciente, inserirPaciente } from '@/database/pacientes';
import type { Patient } from '@/types/patient';

import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

// Rotas próprias deste teste (sem alterar o helper compartilhado): o perfil e destinos simples
function abrirPerfil(id: string) {
  return renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'patient/[id]/index': TelaPerfilPaciente,
      'patient/[id]/edit': () => <Text>Tela de edição</Text>,
      'assessment/setup': () => <Text>Configuração da avaliação</Text>,
    },
    { initialUrl: `/patient/${id}` },
  );
}

async function cadastrarAna(): Promise<Patient> {
  return inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: 'pos_lca',
    pernaLesionada: 'direita',
    dataLesao: '2026-05-20',
  });
}

async function cadastrarBruno(): Promise<Patient> {
  return inserirPaciente(bancoDaTela(), {
    nome: 'Bruno Lima',
    dataNascimento: '1988-07-02',
    perfil: 'corredor',
    pernaLesionada: 'nenhuma',
    dataLesao: null,
  });
}

describe('tela de perfil do paciente (entrega 1)', () => {
  beforeEach(async () => {
    jest.useFakeTimers({
      now: new Date('2026-11-22T12:00:00'),
      doNotFake: ['nextTick', 'setImmediate'],
    });
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.useRealTimers();
  });

  it('mostra os dados do paciente, os cards vazios e o botão de nova avaliação', async () => {
    const ana = await cadastrarAna();
    await abrirPerfil(ana.id);

    expect(await screen.findByText('Ana Souza')).toBeOnTheScreen();
    expect(screen.getByText('Pós-LCA · 31 anos')).toBeOnTheScreen();
    expect(screen.getByText('15/03/1995')).toBeOnTheScreen();
    expect(screen.getByText('Direita')).toBeOnTheScreen();
    expect(screen.getByText('Cirurgia')).toBeOnTheScreen();
    expect(screen.getByText('20/05/2026')).toBeOnTheScreen();
    expect(screen.getByText('Último LSI')).toBeOnTheScreen();
    expect(screen.getByText('Último RSI')).toBeOnTheScreen();
    expect(screen.getAllByText('Sem avaliações')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '+ Nova Avaliação' })).toBeOnTheScreen();
  });

  it('sem data da lesão mostra "Não informada" com o rótulo "Lesão"', async () => {
    const bruno = await cadastrarBruno();
    await abrirPerfil(bruno.id);

    expect(await screen.findByText('Lesão')).toBeOnTheScreen();
    expect(screen.getByText('Não informada')).toBeOnTheScreen();
    expect(screen.getByText('Nenhuma')).toBeOnTheScreen();
  });

  it('mostra o histórico vazio', async () => {
    const ana = await cadastrarAna();
    await abrirPerfil(ana.id);

    expect(await screen.findByText('Avaliações')).toBeOnTheScreen();
    expect(screen.getByText('Nenhuma avaliação ainda.')).toBeOnTheScreen();
  });

  it('+ Nova Avaliação abre a configuração com o paciente', async () => {
    const ana = await cadastrarAna();
    await abrirPerfil(ana.id);

    await fireEvent.press(await screen.findByRole('button', { name: '+ Nova Avaliação' }));

    expect(await screen.findByText('Configuração da avaliação')).toBeOnTheScreen();
    expect(screen).toHavePathname('/assessment/setup');
    expect(screen).toHaveSearchParams({ pacienteId: ana.id });
  });

  it('Editar abre a edição do paciente', async () => {
    const ana = await cadastrarAna();
    await abrirPerfil(ana.id);

    await fireEvent.press(await screen.findByRole('button', { name: 'Editar' }));

    expect(await screen.findByText('Tela de edição')).toBeOnTheScreen();
    expect(screen).toHavePathname(`/patient/${ana.id}/edit`);
  });

  it('ao voltar para a tela, recarrega e mostra o nome editado', async () => {
    const ana = await cadastrarAna();
    await abrirPerfil(ana.id);
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar' }));
    await screen.findByText('Tela de edição');

    await atualizarPaciente(bancoDaTela(), ana.id, {
      nome: 'Ana Souza Lima',
      dataNascimento: ana.dataNascimento,
      perfil: ana.perfil,
      pernaLesionada: ana.pernaLesionada,
      dataLesao: ana.dataLesao,
    });
    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.back();
    });

    expect(await screen.findByText('Ana Souza Lima')).toBeOnTheScreen();
  });

  it('id inexistente mostra "Paciente não encontrado." e volta para a lista', async () => {
    await abrirPerfil('00000000-0000-4000-8000-000000000000');

    expect(await screen.findByText('Paciente não encontrado.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Tela de pacientes')).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
  });

  it('id inválido também mostra "Paciente não encontrado."', async () => {
    await abrirPerfil('nao-e-uuid');

    expect(await screen.findByText('Paciente não encontrado.')).toBeOnTheScreen();
  });
});
