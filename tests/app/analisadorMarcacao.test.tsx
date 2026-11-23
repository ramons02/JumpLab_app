import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaAnalisador from '@/app/assessment/analyze';
import TelaConfiguracao from '@/app/assessment/setup';
import { inserirPaciente } from '@/database/pacientes';
import type { VideoSelecionado } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import { importarVideoDaGaleria } from '@/video/importarVideo';

import { reiniciarTocador } from '../helpers/mockExpoVideo';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('expo-video', () => jest.requireActual('../helpers/mockExpoVideo').moduloExpoVideo);
jest.mock('@/video/importarVideo', () => ({ importarVideoDaGaleria: jest.fn() }));
jest.mock('@/video/descartarVideos', () => ({ descartarVideos: jest.fn(() => Promise.resolve()) }));

const importar = jest.mocked(importarVideoDaGaleria);

/** 10 s a 240 fps: 2400 quadros. Com a barra de 2400 px, o toque em x vai ao quadro x. */
const DURACAO_S = 10;
const TOTAL_QUADROS = 2400;

function video(nome: string): VideoSelecionado {
  return {
    uri: `file:///cache/${nome}`,
    nome,
    duracaoS: DURACAO_S,
    fpsLido: 240,
    fpsDoArquivo: 240,
    temporario: true,
  };
}

async function abrirAnalisador(protocolo: string, pernaLesionada: PernaLesionada = 'direita') {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: pernaLesionada === 'nenhuma' ? 'corredor' : 'pos_lca',
    pernaLesionada,
    dataLesao: pernaLesionada === 'nenhuma' ? null : '2026-05-20',
  });
  const app = await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/setup': TelaConfiguracao,
      'assessment/analyze': TelaAnalisador,
      'assessment/result': () => <Text>Tela de resultado</Text>,
    },
    { initialUrl: `/assessment/setup?pacienteId=${paciente.id}` },
  );
  await fireEvent.press(await screen.findByRole('radio', { name: protocolo }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Ir para o vídeo' }));
  await screen.findByRole('button', { name: 'Escolher vídeo da galeria' });
  return app;
}

async function escolherVideoEConfirmar(nome = 'salto.mp4') {
  importar.mockResolvedValueOnce({ tipo: 'ok', video: video(nome) });
  await fireEvent.press(screen.getByRole('button', { name: 'Escolher vídeo da galeria' }));
  await screen.findByText(/fps lido do vídeo/);
}

async function irAoQuadro(quadro: number) {
  const barra = screen.getByTestId('barra-quadros');
  await fireEvent(barra, 'layout', {
    nativeEvent: { layout: { width: TOTAL_QUADROS, height: 40 } },
  });
  // A barra solta na última posição do toque: tocar no ponto e soltar.
  await fireEvent(barra, 'responderGrant', { nativeEvent: { locationX: quadro } });
  await fireEvent(barra, 'responderRelease', { nativeEvent: { locationX: quadro } });
}

async function marcarEm(rotulo: string, quadro: number) {
  await irAoQuadro(quadro);
  await fireEvent.press(screen.getByRole('button', { name: rotulo }));
}

const botao = (rotulo: string) => screen.getByRole('button', { name: rotulo });
const verResultado = () => screen.getByRole('button', { name: 'Ver resultado' });
const aba = (nome: RegExp) => screen.getByRole('tab', { name: nome });

async function completarCmj(decolagem = 1000, aterrissagem = 1120) {
  await marcarEm('[Marcar Decolagem]', decolagem);
  await marcarEm('[Marcar Aterrissagem]', aterrissagem);
}

describe('analisador: marcar os eventos e calcular', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarTocador();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  describe('US1: marcar decolagem e aterrissagem e ver a prévia', () => {
    it('em Trocar FPS, os botões ficam bloqueados até confirmar', async () => {
      await abrirAnalisador('CMJ Bilateral');
      importar.mockResolvedValueOnce({ tipo: 'ok', video: video('salto.mp4') });
      await fireEvent.press(screen.getByRole('button', { name: 'Escolher vídeo da galeria' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Trocar FPS' }));

      expect(botao('[Marcar Decolagem]')).toBeDisabled();
      expect(botao('[Marcar Aterrissagem]')).toBeDisabled();

      await fireEvent.press(screen.getByRole('button', { name: 'Confirmar FPS' }));
      expect(botao('[Marcar Decolagem]')).toBeEnabled();
    });

    it('CA01 e CA05: marca, recusa fora de ordem, mostra a prévia e substitui', async () => {
      await abrirAnalisador('CMJ Bilateral');
      await escolherVideoEConfirmar();

      await marcarEm('[Marcar Decolagem]', 1000);
      expect(screen.getByText('quadro 1000')).toBeOnTheScreen();

      await marcarEm('[Marcar Aterrissagem]', 990);
      expect(
        screen.getByText(
          'Marcação recusada: a aterrissagem precisa vir depois da decolagem (quadro 1000).',
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('não marcado')).toBeOnTheScreen();
      expect(screen.queryByTestId('previa-tentativa')).toBeNull();

      await marcarEm('[Marcar Aterrissagem]', 1120);
      expect(screen.queryByText(/Marcação recusada/)).toBeNull();
      expect(screen.getByText('Prévia · tentativa 1')).toBeOnTheScreen();
      expect(screen.getByText('30,7 cm')).toBeOnTheScreen();
      expect(screen.getByText('(±0,5) · voo')).toBeOnTheScreen();
      expect(screen.getByText('500 ms')).toBeOnTheScreen();

      // Remarcar a decolagem no 1010: voo de 110 quadros = 458 ms, 25,8 cm.
      await marcarEm('[Marcar Decolagem]', 1010);
      expect(screen.getByText('quadro 1010')).toBeOnTheScreen();
      expect(screen.getByText('458 ms')).toBeOnTheScreen();
      expect(screen.getByText('25,8 cm')).toBeOnTheScreen();
    });

    it('o Squat Jump mostra os mesmos dois botões', async () => {
      await abrirAnalisador('Squat Jump');
      await escolherVideoEConfirmar();
      expect(botao('[Marcar Decolagem]')).toBeOnTheScreen();
      expect(botao('[Marcar Aterrissagem]')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: '[1. Toque no Solo]' })).toBeNull();
    });
  });

  describe('US2: três tentativas e Ver resultado', () => {
    it('três abas; o mesmo vídeo da anterior; Ver resultado só com as três completas', async () => {
      const app = await abrirAnalisador('CMJ Bilateral');
      expect(screen.getByText('3 tentativas; o resultado é a média delas.')).toBeOnTheScreen();
      expect(aba(/^Tentativa 1/)).toBeSelected();
      expect(aba(/^Tentativa 2/)).toBeOnTheScreen();
      expect(aba(/^Tentativa 3/)).toBeOnTheScreen();

      await escolherVideoEConfirmar();
      await completarCmj();
      expect(aba(/^Tentativa 1, completa/)).toBeOnTheScreen();

      await fireEvent.press(aba(/^Tentativa 2/));
      expect(screen.queryByRole('button', { name: /Mesmo vídeo/ })).not.toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: 'Mesmo vídeo da tentativa 1' }));
      expect(screen.getByText('240 fps lido do vídeo · salto.mp4')).toBeOnTheScreen();
      await completarCmj(1500, 1610);

      expect(verResultado()).toBeDisabled();
      expect(screen.getByText('Para ver o resultado, falta:')).toBeOnTheScreen();
      expect(screen.getByText('• Tentativa 3: sem vídeo')).toBeOnTheScreen();

      await fireEvent.press(aba(/^Tentativa 3/));
      await fireEvent.press(screen.getByRole('button', { name: 'Mesmo vídeo da tentativa 2' }));
      expect(screen.getAllByText('não marcado')).toHaveLength(2);
      await completarCmj(2000, 2105);

      expect(verResultado()).toBeEnabled();
      expect(screen.queryByTestId('pendencias-resultado')).toBeNull();
      await fireEvent.press(verResultado());
      await waitFor(() => expect(app.getPathname()).toBe('/assessment/result'));
    });

    it('voltar à tentativa 1 mantém as marcações e o quadro', async () => {
      await abrirAnalisador('CMJ Bilateral');
      await escolherVideoEConfirmar();
      await completarCmj(1000, 1120);

      await fireEvent.press(aba(/^Tentativa 2/));
      await fireEvent.press(screen.getByRole('button', { name: 'Mesmo vídeo da tentativa 1' }));
      await irAoQuadro(300);
      expect(screen.getByText(/^Quadro 300 \//)).toBeOnTheScreen();

      await fireEvent.press(aba(/^Tentativa 1/));
      expect(screen.getByText('quadro 1000')).toBeOnTheScreen();
      expect(screen.getByText('quadro 1120')).toBeOnTheScreen();
      expect(screen.getByText(/^Quadro 1120 \//)).toBeOnTheScreen();
    });
  });

  describe('US3: Drop Jump', () => {
    it('CA02: três eventos, recusa do toque depois da decolagem, contato e RSI', async () => {
      await abrirAnalisador('Drop Jump');
      await escolherVideoEConfirmar();
      expect(botao('[1. Toque no Solo]')).toBeOnTheScreen();
      expect(botao('[2. Decolagem]')).toBeOnTheScreen();
      expect(botao('[3. Aterrissagem Final]')).toBeOnTheScreen();

      await marcarEm('[2. Decolagem]', 548);
      await marcarEm('[1. Toque no Solo]', 560);
      expect(
        screen.getByText(
          'Marcação recusada: o toque no solo precisa vir antes da decolagem (quadro 548).',
        ),
      ).toBeOnTheScreen();

      await marcarEm('[1. Toque no Solo]', 500);
      await marcarEm('[3. Aterrissagem Final]', 644);
      expect(screen.getByText('19,6 cm')).toBeOnTheScreen();
      expect(screen.getByText('400 ms')).toBeOnTheScreen();
      expect(screen.getByText('200 ms')).toBeOnTheScreen();
      expect(screen.getByText('0,98')).toBeOnTheScreen();
    });
  });

  describe('US4: unilateral', () => {
    async function completarPerna() {
      for (const numero of [1, 2, 3]) {
        await fireEvent.press(aba(new RegExp(`^Tentativa ${numero}`)));
        if (numero === 1) await escolherVideoEConfirmar(`perna-${Math.random()}.mp4`);
        else
          await fireEvent.press(
            screen.getByRole('button', { name: `Mesmo vídeo da tentativa ${numero - 1}` }),
          );
        await completarCmj(1000, 1100 + numero * 10);
      }
    }

    it('abas por perna com a lesionada; Ver resultado só com as seis tentativas', async () => {
      const app = await abrirAnalisador('CMJ Unilateral', 'direita');
      expect(
        screen.getByText('3 tentativas por perna; o resultado é a média delas.'),
      ).toBeOnTheScreen();
      expect(aba(/^Perna direita \(lesionada\)/)).toBeSelected();
      expect(aba(/^Perna esquerda/)).toBeOnTheScreen();

      await completarPerna();
      expect(aba(/^Perna direita \(lesionada\), completa/)).toBeOnTheScreen();
      expect(verResultado()).toBeDisabled();

      await fireEvent.press(aba(/^Perna esquerda/));
      expect(aba(/^Tentativa 1/)).toBeSelected();
      expect(screen.getByRole('button', { name: 'Escolher vídeo da galeria' })).toBeOnTheScreen();
      await completarPerna();

      expect(verResultado()).toBeEnabled();
      await fireEvent.press(verResultado());
      await waitFor(() => expect(app.getPathname()).toBe('/assessment/result'));
    });

    it('sem perna lesionada, as abas não têm "(lesionada)"', async () => {
      await abrirAnalisador('CMJ Unilateral', 'nenhuma');
      expect(aba(/^Perna direita$/)).toBeOnTheScreen();
      expect(aba(/^Perna esquerda$/)).toBeOnTheScreen();
      expect(screen.queryByText(/lesionada/)).toBeNull();
    });
  });

  describe('D23: tela de marcação guiada', () => {
    const rodape = () => screen.getByTestId('acao-rodape');

    it('CA07 e CA08: passo guiado, marcar pelo rodapé, voo na barra e próxima tentativa', async () => {
      await abrirAnalisador('CMJ Bilateral');
      await escolherVideoEConfirmar();
      await irAoQuadro(1000);

      expect(screen.getByText('Passo 1 de 2 · Decolagem')).toBeOnTheScreen();
      expect(rodape()).toHaveTextContent('Marcar decolagem no quadro 1000');
      await fireEvent.press(rodape());
      expect(screen.getByTestId('selo-evento')).toHaveTextContent('D · decolagem');

      await irAoQuadro(1120);
      expect(screen.getByText('Passo 2 de 2 · Aterrissagem')).toBeOnTheScreen();
      await fireEvent.press(rodape());

      expect(screen.getByText('voo · 120 quadros')).toBeOnTheScreen();
      expect(screen.queryByTestId('passo-guiado')).toBeNull();
      expect(
        screen.getByText('Para corrigir: vá ao quadro certo e toque no evento.'),
      ).toBeOnTheScreen();
      expect(rodape()).toHaveTextContent('Ir para a tentativa 2');
    });

    it('CA09: Ir para a tentativa 2 abre a tentativa 2', async () => {
      await abrirAnalisador('CMJ Bilateral');
      await escolherVideoEConfirmar();
      await completarCmj();
      await fireEvent.press(rodape());
      expect(aba(/^Tentativa 2/)).toBeSelected();
      expect(screen.queryByTestId('acao-rodape')).toBeNull();
    });

    it('CA10: Ir ao quadro leva ao evento marcado', async () => {
      await abrirAnalisador('CMJ Bilateral');
      await escolherVideoEConfirmar();
      await completarCmj();
      await fireEvent.press(botao('Ir ao quadro 1000'));
      expect(screen.getByText('Quadro 1000 / 2399')).toBeOnTheScreen();
      expect(screen.getByTestId('selo-evento')).toHaveTextContent('D · decolagem');
    });

    it('o rodapé recusa fora de ordem como o botão do evento', async () => {
      await abrirAnalisador('Drop Jump');
      await escolherVideoEConfirmar();
      await marcarEm('[2. Decolagem]', 500);
      expect(screen.getByText('Passo 1 de 3 · Toque no solo')).toBeOnTheScreen();
      await irAoQuadro(600);
      await fireEvent.press(rodape());
      expect(screen.getByRole('alert')).toHaveTextContent(/o toque no solo precisa vir antes/);
    });

    it('unilateral: com a perna completa, o rodapé leva à outra perna; tudo completo, Ver resultado', async () => {
      const app = await abrirAnalisador('CMJ Unilateral');
      for (const n of [1, 2, 3]) {
        if (n > 1) await fireEvent.press(rodape());
        expect(aba(new RegExp(`^Tentativa ${n}`))).toBeSelected();
        await escolherVideoEConfirmar(`direita${n}.mp4`);
        await completarCmj();
      }
      expect(rodape()).toHaveTextContent('Ir para a perna esquerda, tentativa 1');
      await fireEvent.press(rodape());
      for (const n of [1, 2, 3]) {
        if (n > 1) await fireEvent.press(rodape());
        await escolherVideoEConfirmar(`esquerda${n}.mp4`);
        await completarCmj();
      }
      expect(rodape()).toHaveTextContent('Ver resultado');
      await fireEvent.press(rodape());
      await waitFor(() => expect(app.getPathname()).toBe('/assessment/result'));
    });
  });
});
