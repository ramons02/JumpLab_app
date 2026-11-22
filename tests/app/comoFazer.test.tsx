import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaComoFazer from '@/app/assessment/how-to';
import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import type { Protocol } from '@/types/protocol';
import { COMO_FAZER, DICA_FILMAGEM_AGACHAMENTO, DICA_FILMAGEM_SALTO } from '@/utils/comoFazer';

import { mockTocador, reiniciarTocador } from '../helpers/mockExpoVideo';

jest.mock('expo-video', () => jest.requireActual('../helpers/mockExpoVideo').moduloExpoVideo);

/** Configuração simulada: grava o protocolo no rascunho e mostra o botão que abre o "Como fazer". */
function Configuracao({ protocolo }: { protocolo: Protocol | null }) {
  const { iniciarRascunho } = useRascunhoAvaliacao();
  const gravado = useRef(false);
  useEffect(() => {
    if (protocolo && !gravado.current) {
      gravado.current = true;
      iniciarRascunho({
        pacienteId: '11111111-1111-4111-8111-111111111111',
        protocolo,
        cargaKg: protocolo === 'agach' ? 60 : null,
        dataHora: '2026-11-22T10:30',
        pernaLesionada: 'direita',
      });
    }
  }, [iniciarRascunho, protocolo]);
  return <Text>Configuração</Text>;
}

async function abrirComoFazer(protocolo: Protocol | null) {
  await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/setup': () => <Configuracao protocolo={protocolo} />,
      'assessment/how-to': TelaComoFazer,
      'assessment/analyze': () => <Text>Analisador</Text>,
    },
    { initialUrl: '/assessment/setup' },
  );
  await screen.findByText('Configuração');
  await act(async () => {
    const { router } = jest.requireActual('expo-router');
    router.push('/assessment/how-to');
  });
}

describe('tela Como fazer', () => {
  beforeEach(() => reiniciarTocador());

  it('Squat Jump: vídeo em repetição, sem som, passos, o que mede e a dica de frente', async () => {
    await abrirComoFazer('sj');

    expect(await screen.findByText('Squat Jump')).toBeOnTheScreen();
    expect(mockTocador.fonte).toBe(COMO_FAZER.sj.video);
    expect(mockTocador.loop).toBe(true);
    expect(mockTocador.muted).toBe(true);
    expect(mockTocador.play).toHaveBeenCalled();
    expect(screen.getByTestId('video-demonstrativo')).toHaveProp('nativeControls', false);
    expect(screen.getByText('vídeo demonstrativo · 0,5x')).toBeOnTheScreen();

    expect(screen.getByText('1.')).toBeOnTheScreen();
    expect(screen.getByText('3.')).toBeOnTheScreen();
    COMO_FAZER.sj.passos.forEach((passo) => expect(screen.getByText(passo)).toBeOnTheScreen());
    expect(screen.getByText('O que mede')).toBeOnTheScreen();
    expect(screen.getByText(COMO_FAZER.sj.objetivo)).toBeOnTheScreen();
    expect(screen.getByText(DICA_FILMAGEM_SALTO)).toBeOnTheScreen();
  });

  it('mostra "repetindo" depois da primeira volta do vídeo', async () => {
    await abrirComoFazer('sj');
    await screen.findByText('Squat Jump');
    expect(screen.queryByText('repetindo')).toBeNull();

    await act(async () => mockTocador.emitir('playToEnd'));

    expect(screen.getByText('repetindo')).toBeOnTheScreen();
  });

  it('agachamento mostra a dica de filmar de lado e o quarto passo', async () => {
    await abrirComoFazer('agach');

    expect(await screen.findByText('Agachamento com barra')).toBeOnTheScreen();
    expect(screen.getByText(DICA_FILMAGEM_AGACHAMENTO)).toBeOnTheScreen();
    expect(screen.getByText('4.')).toBeOnTheScreen();
    expect(mockTocador.fonte).toBe(COMO_FAZER.agach.video);
  });

  it('"Entendi, ir para o vídeo" abre o analisador, e voltar retorna ao Como fazer', async () => {
    await abrirComoFazer('cmj_bi');

    await fireEvent.press(await screen.findByRole('button', { name: 'Entendi, ir para o vídeo' }));

    expect(await screen.findByText('Analisador')).toBeOnTheScreen();
    expect(screen).toHavePathname('/assessment/analyze');

    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.back();
    });
    expect(await screen.findByText('CMJ Bilateral')).toBeOnTheScreen();
    expect(screen).toHavePathname('/assessment/how-to');
  });

  it('sem protocolo no rascunho, mostra a mensagem e volta', async () => {
    await abrirComoFazer(null);

    expect(
      await screen.findByText('Escolha o protocolo antes de ver como fazer.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Configuração')).toBeOnTheScreen();
    expect(screen).toHavePathname('/assessment/setup');
  });
});
