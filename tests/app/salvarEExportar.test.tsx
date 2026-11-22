import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text, ToastAndroid } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaResultado, { MENSAGEM_SALVA, MENSAGEM_SALVA_SEM_PDF } from '@/app/assessment/result';
import { inserirPaciente } from '@/database/pacientes';
import type { Attempt } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';

import { CMJ_UNILATERAL, DROP_JUMP } from '../helpers/avaliacoesDeTeste';
import { laudo, reiniciarLaudo } from '../helpers/mocksLaudo';
import { RascunhoPronto } from '../helpers/rascunhoDeTeste';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('@/video/descartarVideos', () => ({ descartarVideos: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-print', () => require('../helpers/mocksLaudo').moduloPrint);
jest.mock('expo-sharing', () => require('../helpers/mocksLaudo').moduloSharing);

async function abrirResultado(protocolo: Protocol, tentativas: Attempt[]) {
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
          pernaLesionada="direita"
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
  await screen.findByRole('button', { name: 'Salvar e exportar PDF' });
  return { app, paciente };
}

const contarAvaliacoes = async () =>
  (await bancoDaTela().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM avaliacao'))?.n;
const botaoExportar = () => screen.getByRole('button', { name: 'Salvar e exportar PDF' });

describe('Salvar e exportar PDF', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarLaudo();
    await prepararBanco();
  });

  afterEach(() => {
    fecharBanco();
    jest.restoreAllMocks();
  });

  it('grava a avaliação, gera o laudo dela, compartilha e volta ao perfil sem perguntar', async () => {
    const aviso = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => undefined);
    const { app, paciente } = await abrirResultado('dj', DROP_JUMP);

    await fireEvent.press(botaoExportar());

    await waitFor(() => expect(app.getPathname()).toBe(`/patient/${paciente.id}`));
    expect(await contarAvaliacoes()).toBe(1);
    expect(laudo.htmls).toHaveLength(1);
    expect(laudo.htmls[0]).toContain('Drop Jump');
    expect(laudo.htmls[0]).toContain('Ana Souza');
    expect(laudo.compartilhados).toEqual([
      {
        uri: 'file:///cache/Print/laudo-1.pdf',
        opcoes: expect.objectContaining({ mimeType: 'application/pdf' }),
      },
    ]);
    expect(aviso).toHaveBeenCalledWith(MENSAGEM_SALVA, ToastAndroid.SHORT);
  });

  it('falha no PDF mantém a avaliação gravada, avisa e volta ao perfil', async () => {
    const aviso = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => undefined);
    laudo.falharAoGerar = true;
    const { app, paciente } = await abrirResultado('cmj_uni', CMJ_UNILATERAL);

    await fireEvent.press(botaoExportar());

    await waitFor(() => expect(app.getPathname()).toBe(`/patient/${paciente.id}`));
    expect(await contarAvaliacoes()).toBe(1);
    expect(laudo.compartilhados).toHaveLength(0);
    expect(aviso).toHaveBeenCalledWith(MENSAGEM_SALVA_SEM_PDF, ToastAndroid.SHORT);
  });

  it('Só salvar continua gravando sem gerar PDF', async () => {
    jest.spyOn(ToastAndroid, 'show').mockImplementation(() => undefined);
    const { app, paciente } = await abrirResultado('dj', DROP_JUMP);

    await fireEvent.press(screen.getByRole('button', { name: 'Só salvar' }));

    await waitFor(() => expect(app.getPathname()).toBe(`/patient/${paciente.id}`));
    expect(await contarAvaliacoes()).toBe(1);
    expect(laudo.htmls).toHaveLength(0);
  });
});
