import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaAnalisador from '@/app/assessment/analyze';
import TelaConfiguracao from '@/app/assessment/setup';
import { inserirPaciente } from '@/database/pacientes';
import { CHAVE_SUGESTAO_AUTOMATICA, gravarPreferencia } from '@/database/preferencias';
import type { VideoSelecionado } from '@/types/attempt';
import { MOTIVO_PES_INSUFICIENTES } from '@/utils/sugestaoQuadros';
import { importarVideoDaGaleria } from '@/video/importarVideo';

import * as deteccao from '../helpers/mockDeteccaoPose';
import { reiniciarTocador } from '../helpers/mockExpoVideo';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('expo-video', () => jest.requireActual('../helpers/mockExpoVideo').moduloExpoVideo);
jest.mock('@/video/importarVideo', () => ({ importarVideoDaGaleria: jest.fn() }));
jest.mock('@/video/descartarVideos', () => ({ descartarVideos: jest.fn(() => Promise.resolve()) }));

const importar = jest.mocked(importarVideoDaGaleria);

const CHAO = 0.9;
const AR = 0.7;
const CAIXA = 0.6;

/** CMJ: decolagem no 300 e aterrissagem no 420 (CA01). */
const cmj = (q: number) => deteccao.pesNaAltura(q >= 300 && q < 420 ? AR : CHAO);

/** Drop Jump: caixa até 99, queda, toque no 150, decolagem no 200 e aterrissagem no 280. */
function dropJump(q: number) {
  if (q < 100) return deteccao.pesNaAltura(CAIXA);
  if (q < 150) return deteccao.pesNaAltura(CAIXA + ((q - 100) / 50) * 0.05);
  if (q < 200 || q >= 280) return deteccao.pesNaAltura(CHAO);
  return deteccao.pesNaAltura(AR);
}

function video(nome: string): VideoSelecionado {
  return {
    uri: `file:///cache/${nome}`,
    nome,
    duracaoS: 4,
    fpsLido: 240,
    fpsDoArquivo: 240,
    temporario: true,
  };
}

async function abrirAnalisador(protocolo: string, esperarVideo = true) {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: 'corredor',
    pernaLesionada: 'nenhuma',
    dataLesao: null,
  });
  await renderRouter(
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
  if (esperarVideo) await screen.findByRole('button', { name: 'Escolher vídeo da galeria' });
}

async function escolherVideoEConfirmar(nome = 'salto.mp4') {
  importar.mockResolvedValueOnce({ tipo: 'ok', video: video(nome) });
  await fireEvent.press(screen.getByRole('button', { name: 'Escolher vídeo da galeria' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Confirmar FPS' }));
}

const ligarSugestao = () => gravarPreferencia(bancoDaTela(), CHAVE_SUGESTAO_AUTOMATICA, '1');
const botao = (rotulo: string) => screen.getByRole('button', { name: rotulo });

describe('analisador: sugestão automática dos quadros (spec 018)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarTocador();
    deteccao.reiniciarDeteccaoPose();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('com a chave desligada não oferece a sugestão (CA05)', async () => {
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();
    expect(screen.queryByRole('button', { name: 'Sugerir quadros' })).toBeNull();
  });

  it('ligada, só aparece depois de confirmar o FPS', async () => {
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    importar.mockResolvedValueOnce({ tipo: 'ok', video: video('salto.mp4') });
    await fireEvent.press(screen.getByRole('button', { name: 'Escolher vídeo da galeria' }));
    await screen.findByRole('button', { name: 'Confirmar FPS' });
    expect(screen.queryByRole('button', { name: 'Sugerir quadros' })).toBeNull();
    await fireEvent.press(botao('Confirmar FPS'));
    expect(await screen.findByRole('button', { name: 'Sugerir quadros' })).toBeOnTheScreen();
  });

  it('analisando deixa marcar à mão e, pronta, lista os quadros sem marcar nada (CA01)', async () => {
    deteccao.simularVideo(960, cmj);
    deteccao.segurarAnalise();
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();

    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));
    expect(await screen.findByText('Analisando o vídeo no aparelho...')).toBeOnTheScreen();
    expect(botao('[Marcar Decolagem]')).toBeEnabled();
    expect(botao('+1 Frame')).toBeEnabled();

    await act(async () => deteccao.liberarAnalise());
    await act(async () => deteccao.liberarAnalise());

    expect(await screen.findByText('sugerido no quadro 300')).toBeOnTheScreen();
    expect(screen.getByText('sugerido no quadro 420')).toBeOnTheScreen();
    expect(screen.getAllByText('não marcado')).toHaveLength(2);

    await fireEvent.press(botao('Ir ao quadro 300'));
    expect(screen.getByText(/^Quadro 300 \//)).toBeOnTheScreen();
    expect(screen.getAllByText('não marcado')).toHaveLength(2);
  });

  it('Drop Jump lista também o toque no solo', async () => {
    deteccao.simularVideo(960, dropJump);
    await ligarSugestao();
    await abrirAnalisador('Drop Jump');
    await escolherVideoEConfirmar();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));
    expect(await screen.findByText('Toque no solo')).toBeOnTheScreen();
    expect(screen.getByText('sugerido no quadro 150')).toBeOnTheScreen();
    expect(screen.getByText('sugerido no quadro 200')).toBeOnTheScreen();
    expect(screen.getByText('sugerido no quadro 280')).toBeOnTheScreen();
  });

  it('agachamento não mostra o painel', async () => {
    await ligarSugestao();
    await abrirAnalisador('Agachamento com barra', false);
    expect(await screen.findByText(/Agachamento com barra/)).toBeOnTheScreen();
    expect(screen.queryByText('Sugestão automática')).toBeNull();
  });
});

describe('conferir e ajustar a sugestão (spec 018, US2)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarTocador();
    deteccao.reiniciarDeteccaoPose();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('ir ao 299, avançar um e marcar dá "ajustado +1 quadro" (CA02)', async () => {
    // decolagem real no 299: a sugestão cai no 299
    deteccao.simularVideo(960, (q) => deteccao.pesNaAltura(q >= 299 && q < 420 ? AR : CHAO));
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Ir ao quadro 299' }));
    await fireEvent.press(botao('+1 Frame'));
    await fireEvent.press(botao('[Marcar Decolagem]'));

    expect(screen.getByText('quadro 300')).toBeOnTheScreen();
    expect(screen.getByText('ajustado +1 quadro')).toBeOnTheScreen();
    expect(screen.getByText('marcado no quadro 300 · ajustado +1 quadro')).toBeOnTheScreen();
  });

  it('marcação fora de ordem continua recusada e a prévia usa só o marcado', async () => {
    deteccao.simularVideo(960, cmj);
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Ir ao quadro 420' }));
    await fireEvent.press(botao('[Marcar Decolagem]'));
    await fireEvent.press(botao('Ir ao quadro 300'));
    await fireEvent.press(botao('[Marcar Aterrissagem]'));
    expect(
      screen.getByText(
        'Marcação recusada: a aterrissagem precisa vir depois da decolagem (quadro 420).',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('previa-tentativa')).toBeNull();
  });

  it('marcar no quadro sugerido dá "conferido"', async () => {
    deteccao.simularVideo(960, cmj);
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Ir ao quadro 300' }));
    await fireEvent.press(botao('[Marcar Decolagem]'));
    expect(screen.getAllByText('conferido')).toHaveLength(1);
    await fireEvent.press(botao('Ir ao quadro 420'));
    await fireEvent.press(botao('[Marcar Aterrissagem]'));
    expect(screen.getAllByText('conferido')).toHaveLength(2);
    expect(screen.getByText('marcado no quadro 420 · conferido')).toBeOnTheScreen();
  });
});

describe('quando não dá para sugerir (spec 018, US3)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarTocador();
    deteccao.reiniciarDeteccaoPose();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('pés fora do enquadramento: aviso e marcação à mão disponível (CA03)', async () => {
    deteccao.simularVideo(960, (q) => (q % 3 === 0 ? cmj(q) : { pes: null, quadris: null }));
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));

    expect(await screen.findByText('Não deu para sugerir.')).toBeOnTheScreen();
    expect(
      screen.getByText(`${MOTIVO_PES_INSUFICIENTES} Marque os quadros à mão.`),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Ir ao quadro/ })).toBeNull();
    expect(botao('[Marcar Decolagem]')).toBeEnabled();
  });

  it('vídeo ilegível mostra a falha sem travar', async () => {
    deteccao.simularVideo(960, cmj);
    deteccao.analisarQuadros.mockRejectedValueOnce(new Error('VIDEO_ILEGIVEL'));
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));
    expect(await screen.findByText('Não deu para sugerir.')).toBeOnTheScreen();
    expect(botao('[Marcar Decolagem]')).toBeEnabled();
  });

  it('sair do analisador durante a análise cancela a análise', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    deteccao.simularVideo(960, cmj);
    deteccao.segurarAnalise();
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));
    await screen.findByText('Analisando o vídeo no aparelho...');

    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.back();
    });
    await waitFor(() => expect(alerta).toHaveBeenCalled());
    const botoes = alerta.mock.calls[0][2] ?? [];
    await act(async () => {
      await botoes.find((b) => b.text === 'Sair')?.onPress?.();
    });
    await waitFor(() => expect(deteccao.cancelarAnalise).toHaveBeenCalledTimes(1));
    expect(deteccao.analisesPendentes()).toBe(0);
  });
});

describe('reaproveitar a sugestão no mesmo vídeo (spec 018, US4)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarTocador();
    deteccao.reiniciarDeteccaoPose();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('a tentativa 2 com o mesmo vídeo traz a sugestão sem nova análise', async () => {
    deteccao.simularVideo(960, cmj);
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));
    await screen.findByText('sugerido no quadro 300');
    expect(deteccao.analisarQuadros).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getByRole('tab', { name: /^Tentativa 2/ }));
    await fireEvent.press(botao('Mesmo vídeo da tentativa 1'));
    expect(await screen.findByText('sugerido no quadro 300')).toBeOnTheScreen();
    expect(deteccao.analisarQuadros).toHaveBeenCalledTimes(2);
  });

  it('trocar o vídeo apaga a sugestão e volta a oferta', async () => {
    deteccao.simularVideo(960, cmj);
    await ligarSugestao();
    await abrirAnalisador('CMJ Bilateral');
    await escolherVideoEConfirmar();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sugerir quadros' }));
    await screen.findByText('sugerido no quadro 300');

    importar.mockResolvedValueOnce({ tipo: 'ok', video: video('outro.mp4') });
    await fireEvent.press(botao('Trocar vídeo'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Confirmar FPS' }));
    expect(screen.queryByText('sugerido no quadro 300')).toBeNull();
    expect(await screen.findByRole('button', { name: 'Sugerir quadros' })).toBeOnTheScreen();
  });
});
