import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert, Text, ToastAndroid } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaResultado from '@/app/assessment/result';
import { inserirPaciente } from '@/database/pacientes';
import type { Attempt } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import { FATOR_PARALLAX } from '@/utils/poseDesenho';
import { descartarVideos } from '@/video/descartarVideos';

import {
  CMJ_BILATERAL,
  CMJ_UNILATERAL,
  DROP_JUMP,
  tresTentativas,
} from '../helpers/avaliacoesDeTeste';
import { RascunhoPronto } from '../helpers/rascunhoDeTeste';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('@/video/descartarVideos', () => ({ descartarVideos: jest.fn(() => Promise.resolve()) }));

const descartar = jest.mocked(descartarVideos);

async function abrirResultado(
  protocolo: Protocol,
  tentativas: Attempt[],
  pernaLesionada: PernaLesionada = 'direita',
) {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: 'pos_lca',
    pernaLesionada: 'direita',
    dataLesao: '2026-05-20',
  });
  const app = await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'patient/[id]/index': () => <Text>Perfil do paciente</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/analyze': () => (
        <RascunhoPronto
          pacienteId={paciente.id}
          protocolo={protocolo}
          pernaLesionada={pernaLesionada}
          tentativas={tentativas}
        />
      ),
      'assessment/result': TelaResultado,
    },
    { initialUrl: `/patient/${paciente.id}` },
  );
  await act(async () => {
    const { router } = jest.requireActual('expo-router');
    router.push('/assessment/analyze');
  });
  await fireEvent.press(await screen.findByRole('button', { name: 'Ver resultado' }));
  await screen.findByRole('button', { name: 'Só salvar' });
  return { app, paciente };
}

const contarAvaliacoes = async () =>
  (await bancoDaTela().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM avaliacao'))?.n;

describe('tela de resultado', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.restoreAllMocks();
  });

  it('Drop Jump mostra altura, tempo de voo, contato e RSI, sem LSI (CA01)', async () => {
    await abrirResultado('dj', DROP_JUMP);

    expect(screen.getAllByText('Altura')).toHaveLength(2); // topo e card
    expect(screen.getByText('Tempo de voo')).toBeOnTheScreen();
    expect(screen.getByText('Tempo de contato')).toBeOnTheScreen();
    expect(screen.getByText('RSI')).toBeOnTheScreen();
    expect(screen.getAllByText('0,98').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('cartao-lsi')).toBeNull();
    expect(screen.queryByText(/dor/i)).toBeNull();
    expect(screen.queryByText(/confiança/i)).toBeNull();
  });

  it('cada card mostra a média e as três tentativas', async () => {
    await abrirResultado('cmj_bi', CMJ_BILATERAL);

    expect(screen.getByText('Média de 3 tentativas')).toBeOnTheScreen();
    expect(screen.getAllByText('Tentativa 3').length).toBe(2); // altura e tempo de voo
    expect(screen.getAllByText('500 ms')).toHaveLength(4); // média e as três tentativas
    expect(screen.getByText('margem ±0,5 cm')).toBeOnTheScreen();
  });

  it('CMJ unilateral mostra as pernas, a lesionada indicada e o LSI com a base', async () => {
    await abrirResultado('cmj_uni', CMJ_UNILATERAL, 'direita');

    expect(screen.getByText('Perna direita (lesionada)')).toBeOnTheScreen();
    expect(screen.getByText('Perna esquerda')).toBeOnTheScreen();
    expect(screen.getByText('84,0%')).toBeOnTheScreen();
    expect(
      screen.getByText(/Perna direita \(lesionada\) ÷ perna sadia, pela altura\./),
    ).toBeOnTheScreen();
  });

  it('60 fps mostra o selo de baixa precisão e a margem maior', async () => {
    await abrirResultado('cmj_bi', tresTentativas('unica', [30, 30, 30], 60));

    expect(screen.getByText('Baixa precisão (60 fps)')).toBeOnTheScreen();
    expect(screen.getByText('margem ±2,0 cm')).toBeOnTheScreen();
  });

  it('Só salvar grava com a observação, apaga os vídeos, volta ao perfil e avisa', async () => {
    const aviso = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
    const { app } = await abrirResultado('cmj_bi', CMJ_BILATERAL);

    await fireEvent.changeText(screen.getByLabelText('Observações'), '  Boa execução.  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Só salvar' }));

    expect(await screen.findByText('Perfil do paciente')).toBeOnTheScreen();
    expect(app.getPathname()).toMatch(/^\/patient\//);
    const linha = await bancoDaTela().getFirstAsync<{ observacoes: string; protocolo: string }>(
      'SELECT observacoes, protocolo FROM avaliacao',
    );
    expect(linha).toEqual({ observacoes: 'Boa execução.', protocolo: 'cmj_bi' });
    expect(descartar).toHaveBeenCalledTimes(1);
    expect(Object.keys(descartar.mock.calls[0][0])).toEqual(['unica']);
    expect(aviso).toHaveBeenCalledWith('Avaliação salva.', ToastAndroid.SHORT);
  });

  it('toque duplo em Só salvar grava uma vez só', async () => {
    jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
    await abrirResultado('cmj_bi', CMJ_BILATERAL);
    const botao = screen.getByRole('button', { name: 'Só salvar' });

    await act(async () => {
      fireEvent.press(botao);
      fireEvent.press(botao);
    });

    await screen.findByText('Perfil do paciente');
    expect(await contarAvaliacoes()).toBe(1);
  });

  describe('descartar (US2)', () => {
    async function voltar() {
      await act(async () => {
        const { router } = jest.requireActual('expo-router');
        router.back();
      });
    }

    it('voltar sem salvar pergunta; Cancelar mantém a tela e a observação', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      await abrirResultado('cmj_bi', CMJ_BILATERAL);
      await fireEvent.changeText(screen.getByLabelText('Observações'), 'Anotação');

      await voltar();

      await waitFor(() =>
        expect(alerta).toHaveBeenCalledWith(
          'Descartar avaliação?',
          'O resultado ainda não foi salvo.',
          expect.any(Array),
        ),
      );
      const botoes = alerta.mock.calls[0][2] ?? [];
      expect(botoes.map((b) => b.text)).toEqual(['Cancelar', 'Descartar']);
      expect(screen.getByLabelText('Observações')).toHaveDisplayValue('Anotação');
      expect(screen.getByRole('button', { name: 'Só salvar' })).toBeOnTheScreen();
    });

    it('Descartar sai sem gravar e apaga os vídeos', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { app } = await abrirResultado('cmj_uni', CMJ_UNILATERAL);

      await voltar();
      await waitFor(() => expect(alerta).toHaveBeenCalled());
      const botoes = alerta.mock.calls[0][2] ?? [];
      await act(async () => {
        await botoes.find((b) => b.text === 'Descartar')?.onPress?.();
      });

      await waitFor(() => expect(app.getPathname()).not.toBe('/assessment/result'));
      expect(await contarAvaliacoes()).toBe(0);
      expect(Object.keys(descartar.mock.calls[0][0]).sort()).toEqual(['direita', 'esquerda']);
    });

    it('depois de salvar, a volta ao perfil não pergunta', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
      await abrirResultado('cmj_bi', CMJ_BILATERAL);

      await fireEvent.press(screen.getByRole('button', { name: 'Só salvar' }));

      expect(await screen.findByText('Perfil do paciente')).toBeOnTheScreen();
      expect(alerta).not.toHaveBeenCalled();
    });
  });

  describe('topo ilustrado (US4)', () => {
    it('CMJ bilateral mostra "Altura" com a média', async () => {
      await abrirResultado('cmj_bi', CMJ_BILATERAL);

      const topo = screen.getByTestId('topo-parallax');
      expect(within(topo).getByText('Altura')).toBeOnTheScreen();
      expect(topo).toHaveTextContent(/30,7 cm/);
    });

    it('unilateral mostra "Altura · perna lesionada" com a perna lesionada', async () => {
      await abrirResultado('cmj_uni', CMJ_UNILATERAL, 'direita');

      const topo = screen.getByTestId('topo-parallax');
      expect(within(topo).getByText('Altura · perna lesionada')).toBeOnTheScreen();
      expect(topo).toHaveTextContent(/25,8 cm/);
    });

    it('rolar a tela desce o topo mais devagar que o conteúdo', async () => {
      await abrirResultado('cmj_bi', CMJ_BILATERAL);
      const ROLAGEM = 40;

      await fireEvent.scroll(screen.getByTestId('rolagem-resultado'), {
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
});
