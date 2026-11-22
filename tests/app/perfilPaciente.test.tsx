import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Stack } from 'expo-router';
import { Text } from 'react-native';

import TelaPerfilPaciente from '@/app/patient/[id]/index';
import { atualizarPaciente, inserirPaciente } from '@/database/pacientes';
import type { Patient } from '@/types/patient';

import { ESPACO_FINAL_PX, FATOR_PARALLAX } from '@/utils/poseDesenho';

import {
  avaliacaoAgachamento,
  avaliacaoSalto,
  gravarNoHistorico,
  lsi,
  perna,
} from '../helpers/historicoDeTeste';
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
      'assessment/[id]': () => <Text>Avaliação salva</Text>,
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
    // dois cards e o topo
    expect(screen.getAllByText('Sem avaliações')).toHaveLength(3);
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

  describe('topo ilustrado', () => {
    it('mostra "Último salto" com "Sem avaliações" antes dos dados, e o espaço final', async () => {
      const ana = await cadastrarAna();
      await abrirPerfil(ana.id);

      const topo = await screen.findByTestId('topo-parallax');
      expect(screen.getByText('Último salto')).toBeOnTheScreen();
      expect(topo).toContainElement(screen.getByText('Último salto'));
      expect(screen.getByTestId('espaco-final')).toHaveStyle({ height: ESPACO_FINAL_PX });
    });

    it('rolar o perfil desce o topo mais devagar que a lista', async () => {
      const ana = await cadastrarAna();
      await abrirPerfil(ana.id);
      const ROLAGEM = 40;

      await fireEvent.scroll((await screen.findByTestId('topo-parallax')).parent!.parent!, {
        nativeEvent: {
          contentOffset: { x: 0, y: ROLAGEM },
          contentSize: { width: 400, height: 1400 },
          layoutMeasurement: { width: 400, height: 800 },
        },
      });

      expect(screen.getByTestId('topo-parallax').children[0]).toHaveStyle({
        transform: [{ translateY: ROLAGEM * FATOR_PARALLAX }],
      });
    });
  });

  describe('entrega 2: valores e histórico', () => {
    async function comHistorico(...avaliacoes: Parameters<typeof gravarNoHistorico>[2][]) {
      const ana = await cadastrarAna();
      for (const a of avaliacoes) await gravarNoHistorico(bancoDaTela(), ana.id, a);
      await abrirPerfil(ana.id);
      await screen.findByText('Ana Souza');
      return ana;
    }

    it('CA02: último LSI 92,0% pela base RSI, do Drop Jump unilateral mais recente', async () => {
      await comHistorico(
        avaliacaoSalto(
          'cmj_uni',
          '2026-11-07T09:00',
          { direita: perna(26), esquerda: perna(30) },
          {
            lsi: lsi(85),
          },
        ),
        avaliacaoSalto(
          'dj_uni',
          '2026-11-14T09:30',
          { direita: perna(17, 1.0), esquerda: perna(19, 1.1) },
          {
            lsi: lsi(92, 'rsi'),
          },
        ),
      );

      expect(screen.getByText('92,0%')).toBeOnTheScreen();
      expect(screen.getByText('Base: RSI (Drop Jump) · 14/11/2026')).toBeOnTheScreen();
    });

    it('último RSI com 2 casas, o protocolo e a data', async () => {
      await comHistorico(avaliacaoSalto('dj', '2026-11-01T07:00', { unica: perna(25, 1.234) }));

      expect(screen.getByText('1,23')).toBeOnTheScreen();
      expect(screen.getByText('Drop Jump · 01/11/2026')).toBeOnTheScreen();
    });

    it('LSI nulo mostra "LSI não calculado"', async () => {
      await comHistorico(avaliacaoSalto('cmj_uni', '2026-11-07T09:00', {}, { lsi: lsi(null) }));
      expect(screen.getAllByText('LSI não calculado').length).toBeGreaterThanOrEqual(1);
    });

    it('o topo mostra a altura do salto mais recente', async () => {
      await comHistorico(
        avaliacaoSalto('cmj_bi', '2026-11-10T07:00', { unica: perna(35.4) }),
        avaliacaoAgachamento('2026-11-20T07:00', 0.85),
      );

      const topo = screen.getByTestId('topo-parallax');
      expect(topo).toHaveTextContent(/Último salto/);
      expect(topo).toHaveTextContent(/35,4 cm/);
    });

    it('histórico da mais recente para a mais antiga, com o selo de baixa precisão', async () => {
      await comHistorico(
        avaliacaoSalto('cmj_bi', '2026-09-15T07:00', { unica: perna(34) }),
        avaliacaoSalto('dj', '2026-11-01T07:00', { unica: perna(25, 1.2) }),
        avaliacaoSalto(
          'sj',
          '2026-10-01T07:00',
          { unica: perna(30, null, true) },
          { baixaPrecisao: true },
        ),
      );

      const itens = screen
        .getAllByRole('button')
        .map((b) => b.props.accessibilityLabel)
        .filter((rotulo) => typeof rotulo === 'string' && /\d{2}\/\d{2}\/\d{4}/.test(rotulo));
      expect(itens).toEqual([
        'Drop Jump, 01/11/2026',
        'Squat Jump, 01/10/2026',
        'CMJ Bilateral, 15/09/2026',
      ]);
      expect(screen.getByText('Baixa precisão (60 fps)')).toBeOnTheScreen();
      expect(screen.queryByText('Nenhuma avaliação ainda.')).toBeNull();
    });

    it('tocar numa avaliação abre a avaliação salva (CA03)', async () => {
      const dj = avaliacaoSalto('dj', '2026-11-01T07:00', { unica: perna(25, 1.2) });
      await comHistorico(dj);

      await fireEvent.press(screen.getByRole('button', { name: 'Drop Jump, 01/11/2026' }));

      expect(await screen.findByText('Avaliação salva')).toBeOnTheScreen();
      expect(screen).toHavePathname(`/assessment/${dj.id}`);
    });
  });
});
