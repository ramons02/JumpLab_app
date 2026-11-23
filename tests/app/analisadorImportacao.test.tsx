import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaAnalisador from '@/app/assessment/analyze';
import TelaConfiguracao from '@/app/assessment/setup';
import { inserirPaciente } from '@/database/pacientes';
import type { VideoSelecionado } from '@/types/attempt';
import { MENSAGEM_AVISO_FPS } from '@/utils/fps';
import { descartarVideos } from '@/video/descartarVideos';
import { importarVideoDaGaleria, type ResultadoImportacao } from '@/video/importarVideo';

import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('@/video/importarVideo', () => ({ importarVideoDaGaleria: jest.fn() }));
jest.mock('@/video/descartarVideos', () => ({ descartarVideos: jest.fn(() => Promise.resolve()) }));

const importar = jest.mocked(importarVideoDaGaleria);

function video(fpsLido: number | null, nome = 'salto.mp4'): VideoSelecionado {
  return {
    uri: `file:///cache/${nome}`,
    nome,
    duracaoS: 4,
    fpsLido,
    fpsDoArquivo: fpsLido,
    temporario: true,
  };
}

function proximaImportacao(resultado: ResultadoImportacao) {
  importar.mockResolvedValueOnce(resultado);
}

/** Abre a configuração, escolhe o protocolo e segue para o analisador, como no app. */
async function abrirAnalisador(protocolo = 'CMJ Bilateral') {
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
      'assessment/_layout': LayoutAvaliacao,
      'assessment/setup': TelaConfiguracao,
      'assessment/analyze': TelaAnalisador,
    },
    { initialUrl: `/assessment/setup?pacienteId=${paciente.id}` },
  );
  await fireEvent.press(await screen.findByRole('radio', { name: protocolo }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Ir para o vídeo' }));
  await screen.findByRole('button', { name: 'Escolher vídeo da galeria' });
  return app;
}

async function escolherVideo(resultado: ResultadoImportacao) {
  proximaImportacao(resultado);
  await fireEvent.press(screen.getByRole('button', { name: 'Escolher vídeo da galeria' }));
}

const chip = (fps: number) => screen.getByRole('radio', { name: `${fps} fps` });
const botaoConfirmar = () => screen.getByRole('button', { name: 'Confirmar FPS' });

describe('analisador: importar vídeo e confirmar o FPS', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.restoreAllMocks();
  });

  describe('US1: importar e confirmar o FPS lido', () => {
    it('mostra protocolo, paciente e a primeira tentativa', async () => {
      await abrirAnalisador();
      expect(await screen.findByText('CMJ Bilateral · Ana Souza')).toBeOnTheScreen();
      expect(screen.getByText('Vídeo do salto · tentativa 1 de 3')).toBeOnTheScreen();
    });

    it('D22: vídeo de 240 fps já vem confirmado, sem o seletor, e as marcações liberadas', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'ok', video: video(240) });

      expect(await screen.findByText('240 fps lido do vídeo · salto.mp4')).toBeOnTheScreen();
      expect(screen.queryByText('Confirme o FPS para liberar as marcações.')).toBeNull();
      expect(screen.queryByText('FPS de gravação')).toBeNull();
    });

    it('permissão negada mostra o motivo', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'permissao_negada' });
      expect(
        await screen.findByText(
          'O JumpLab precisa do acesso aos vídeos para abrir o salto que você filmou. Permita o acesso e tente de novo.',
        ),
      ).toBeOnTheScreen();
    });

    it('vídeo que não abre pede outro', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'erro' });
      expect(
        await screen.findByText('Não foi possível abrir este vídeo. Escolha outro.'),
      ).toBeOnTheScreen();
    });

    it('cancelar a galeria não muda nada', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'cancelado' });
      expect(screen.getByRole('button', { name: 'Escolher vídeo da galeria' })).toBeOnTheScreen();
    });

    it('Ver resultado fica desabilitado (liberado na spec 007)', async () => {
      await abrirAnalisador();
      expect(screen.getByRole('button', { name: 'Ver resultado' })).toBeDisabled();
    });

    it('sair com vídeo escolhido pede confirmação e, confirmada, apaga os vídeos', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const app = await abrirAnalisador();
      await escolherVideo({ tipo: 'ok', video: video(240) });
      await screen.findByText('240 fps lido do vídeo · salto.mp4');

      await act(async () => {
        const { router } = jest.requireActual('expo-router');
        router.back();
      });

      await waitFor(() =>
        expect(alerta).toHaveBeenCalledWith(
          'Sair da avaliação?',
          'As marcações feitas serão perdidas.',
          expect.any(Array),
        ),
      );
      expect(app.getPathname()).toBe('/assessment/analyze');

      const botoes = alerta.mock.calls[0][2] ?? [];
      await act(async () => {
        await botoes.find((b) => b.text === 'Sair')?.onPress?.();
      });

      expect(descartarVideos).toHaveBeenCalledWith({
        unica: [
          {
            video: video(240),
            fpsSelecionado: 240,
            fpsConfirmado: 240,
            marcas: {},
            sugestao: null,
          },
          expect.anything(),
          expect.anything(),
        ],
      });
      await waitFor(() => expect(app.getPathname()).not.toBe('/assessment/analyze'));
    });
  });

  describe('US2: escolher ou corrigir o FPS', () => {
    it('D22: sem FPS nos dados, vale o padrão de 120 sem perguntar', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'ok', video: video(null) });

      expect(await screen.findByText('120 fps padrão · salto.mp4')).toBeOnTheScreen();
      expect(screen.queryByText('FPS de gravação')).toBeNull();
    });

    it('60 fps mostra o aviso de baixa precisão, confirma e o aviso continua', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'ok', video: video(null) });
      await fireEvent.press(await screen.findByRole('button', { name: 'Trocar FPS' }));
      await fireEvent.press(await screen.findByRole('radio', { name: '60 fps' }));

      expect(screen.getByText(MENSAGEM_AVISO_FPS.baixa_precisao)).toBeOnTheScreen();
      await fireEvent.press(botaoConfirmar());

      expect(await screen.findByText('60 fps escolhido · salto.mp4')).toBeOnTheScreen();
      expect(screen.getByText(MENSAGEM_AVISO_FPS.baixa_precisao)).toBeOnTheScreen();
    });

    it('vídeo lido a 480 vem confirmado e, em Trocar FPS, oferece 480 já selecionado', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'ok', video: video(480) });
      await fireEvent.press(await screen.findByRole('button', { name: 'Trocar FPS' }));
      await screen.findByText('FPS de gravação');
      expect(screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel)).toEqual([
        '60 fps',
        '120 fps',
        '240 fps',
        '480 fps',
      ]);
      expect(chip(480)).toBeChecked();
    });

    it('vídeo lido a 30 avisa que não é confiável e não confirma', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'ok', video: video(30) });
      expect(await screen.findByText(MENSAGEM_AVISO_FPS.nao_confiavel)).toBeOnTheScreen();
      expect(chip(30)).toBeChecked();
      expect(botaoConfirmar()).toBeDisabled();
    });

    it('Trocar FPS volta ao seletor com o valor atual e bloqueia as marcações de novo', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'ok', video: video(240) });

      await fireEvent.press(await screen.findByRole('button', { name: 'Trocar FPS' }));

      expect(await screen.findByText('FPS de gravação')).toBeOnTheScreen();
      expect(chip(240)).toBeChecked();
      expect(screen.getByText('Confirme o FPS para liberar as marcações.')).toBeOnTheScreen();
    });

    it('Trocar vídeo troca o FPS pela leitura do vídeo novo', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'ok', video: video(240) });
      await screen.findByText('240 fps lido do vídeo · salto.mp4');

      proximaImportacao({ tipo: 'ok', video: video(120, 'outro.mp4') });
      await fireEvent.press(screen.getByRole('button', { name: 'Trocar vídeo' }));

      expect(await screen.findByText('120 fps lido do vídeo · outro.mp4')).toBeOnTheScreen();
    });

    it('Trocar vídeo por um sem FPS nos dados usa o padrão de 120', async () => {
      await abrirAnalisador();
      await escolherVideo({ tipo: 'ok', video: video(240) });
      await screen.findByText('240 fps lido do vídeo · salto.mp4');

      proximaImportacao({ tipo: 'ok', video: video(null, 'outro.mp4') });
      await fireEvent.press(screen.getByRole('button', { name: 'Trocar vídeo' }));

      expect(await screen.findByText('120 fps padrão · outro.mp4')).toBeOnTheScreen();
    });
  });
});
