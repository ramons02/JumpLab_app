import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Stack } from 'expo-router';
import { Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaConfiguracao from '@/app/assessment/setup';
import { inserirPaciente } from '@/database/pacientes';
import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import type { Patient } from '@/types/patient';

import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

/** Destino de teste: mostra o rascunho que chegou do Context. */
function Destino({ nome }: { nome: string }) {
  const { rascunho } = useRascunhoAvaliacao();
  return (
    <>
      <Text>{nome}</Text>
      <Text testID="rascunho">{JSON.stringify(rascunho)}</Text>
    </>
  );
}

function abrirConfiguracao(pacienteId: string) {
  return renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/setup': TelaConfiguracao,
      'assessment/analyze': () => <Destino nome="Analisador" />,
      'assessment/how-to': () => <Destino nome="Como fazer" />,
    },
    { initialUrl: `/assessment/setup?pacienteId=${pacienteId}` },
  );
}

function rascunhoNaTela() {
  return JSON.parse(String(screen.getByTestId('rascunho').props.children));
}

async function cadastrar(perna: Patient['pernaLesionada'] = 'direita'): Promise<Patient> {
  return inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: perna === 'nenhuma' ? 'corredor' : 'pos_lca',
    pernaLesionada: perna,
    dataLesao: perna === 'nenhuma' ? null : '2026-05-20',
  });
}

const tocar = async (texto: string) =>
  fireEvent.press(await screen.findByRole('button', { name: texto }));
const escolher = async (protocolo: string) =>
  fireEvent.press(await screen.findByRole('radio', { name: protocolo }));

describe('tela de configuração da avaliação', () => {
  beforeEach(async () => {
    jest.useFakeTimers({
      now: new Date(2026, 10, 22, 10, 30, 15),
      doNotFake: ['nextTick', 'setImmediate'],
    });
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.useRealTimers();
  });

  it('mostra o paciente e os seis protocolos, sem nenhum escolhido nem dor, confiança ou caixa', async () => {
    const ana = await cadastrar();
    await abrirConfiguracao(ana.id);

    expect(await screen.findByText('Ana Souza')).toBeOnTheScreen();
    const opcoes = screen.getAllByRole('radio');
    expect(opcoes).toHaveLength(6);
    opcoes.forEach((opcao) => expect(opcao).not.toBeChecked());
    expect(screen.queryByText(/\bdor\b/i)).toBeNull();
    expect(screen.queryByText(/confiança/i)).toBeNull();
    expect(screen.queryByText(/altura da caixa/i)).toBeNull();
  });

  it.each(['Ir para o vídeo', 'Como fazer'])(
    '"%s" sem protocolo mostra o erro e não navega',
    async (botao) => {
      const ana = await cadastrar();
      await abrirConfiguracao(ana.id);

      await tocar(botao);

      expect(await screen.findByText('Escolha o protocolo.')).toBeOnTheScreen();
      expect(screen).toHavePathname('/assessment/setup');
    },
  );

  it('escolher um protocolo apaga a mensagem', async () => {
    const ana = await cadastrar();
    await abrirConfiguracao(ana.id);
    await tocar('Ir para o vídeo');
    await screen.findByText('Escolha o protocolo.');

    await escolher('CMJ Bilateral');

    expect(screen.queryByText('Escolha o protocolo.')).toBeNull();
    expect(screen.getByRole('radio', { name: 'CMJ Bilateral' })).toBeChecked();
  });

  it('com CMJ Bilateral, "Ir para o vídeo" abre o analisador com o rascunho completo', async () => {
    const ana = await cadastrar();
    await abrirConfiguracao(ana.id);

    await escolher('CMJ Bilateral');
    await tocar('Ir para o vídeo');

    expect(await screen.findByText('Analisador')).toBeOnTheScreen();
    expect(screen).toHavePathname('/assessment/analyze');
    expect(rascunhoNaTela()).toEqual({
      pacienteId: ana.id,
      protocolo: 'cmj_bi',
      cargaKg: null,
      dataHora: '2026-11-22T10:30',
      pernaLesionada: 'direita',
    });
  });

  it('"Como fazer" abre a demonstração', async () => {
    const ana = await cadastrar();
    await abrirConfiguracao(ana.id);

    await escolher('Squat Jump');
    await tocar('Como fazer');

    expect(await screen.findByText('Como fazer')).toBeOnTheScreen();
    expect(screen).toHavePathname('/assessment/how-to');
    expect(rascunhoNaTela().protocolo).toBe('sj');
  });

  it('paciente sem perna lesionada pode fazer protocolo unilateral', async () => {
    const corredor = await cadastrar('nenhuma');
    await abrirConfiguracao(corredor.id);

    await escolher('CMJ Unilateral');
    await tocar('Ir para o vídeo');

    expect(await screen.findByText('Analisador')).toBeOnTheScreen();
    expect(rascunhoNaTela()).toMatchObject({ protocolo: 'cmj_uni', pernaLesionada: 'nenhuma' });
  });

  it('paciente inexistente mostra "Paciente não encontrado." e volta', async () => {
    await abrirConfiguracao('00000000-0000-4000-8000-000000000000');

    expect(await screen.findByText('Paciente não encontrado.')).toBeOnTheScreen();
    await tocar('Voltar');

    expect(await screen.findByText('Tela de pacientes')).toBeOnTheScreen();
  });

  describe('carga do agachamento', () => {
    it('o campo de carga só aparece com Agachamento com barra', async () => {
      const ana = await cadastrar();
      await abrirConfiguracao(ana.id);
      await escolher('CMJ Bilateral');
      expect(screen.queryByLabelText('Carga na barra (kg)')).toBeNull();

      await escolher('Agachamento com barra');

      expect(screen.getByLabelText('Carga na barra (kg)')).toBeOnTheScreen();
      expect(screen.getByText('Barra mais anilhas.')).toBeOnTheScreen();
    });

    it.each(['Ir para o vídeo', 'Como fazer'])(
      '"%s" sem carga mostra o erro e não navega',
      async (botao) => {
        const ana = await cadastrar();
        await abrirConfiguracao(ana.id);
        await escolher('Agachamento com barra');

        await tocar(botao);

        expect(await screen.findByText('Informe a carga na barra.')).toBeOnTheScreen();
        expect(screen).toHavePathname('/assessment/setup');
      },
    );

    it('com 62,5 segue e o rascunho leva a carga', async () => {
      const ana = await cadastrar();
      await abrirConfiguracao(ana.id);
      await escolher('Agachamento com barra');

      await fireEvent.changeText(screen.getByLabelText('Carga na barra (kg)'), '62,5');
      await tocar('Ir para o vídeo');

      expect(await screen.findByText('Analisador')).toBeOnTheScreen();
      expect(rascunhoNaTela()).toMatchObject({ protocolo: 'agach', cargaKg: 62.5 });
    });

    it('o campo recusa letras e aceita uma vírgula só', async () => {
      const ana = await cadastrar();
      await abrirConfiguracao(ana.id);
      await escolher('Agachamento com barra');
      const campo = screen.getByLabelText('Carga na barra (kg)');

      await fireEvent.changeText(campo, '6a2,5,0');

      expect(campo).toHaveDisplayValue('62,50');
    });

    it('carga digitada e troca para CMJ Bilateral segue sem carga', async () => {
      const ana = await cadastrar();
      await abrirConfiguracao(ana.id);
      await escolher('Agachamento com barra');
      await fireEvent.changeText(screen.getByLabelText('Carga na barra (kg)'), '80');

      await escolher('CMJ Bilateral');
      await tocar('Ir para o vídeo');

      expect(await screen.findByText('Analisador')).toBeOnTheScreen();
      expect(rascunhoNaTela()).toMatchObject({ protocolo: 'cmj_bi', cargaKg: null });
    });
  });
});
