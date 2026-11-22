import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Text } from 'react-native';

import TelaPerfilPaciente from '@/app/patient/[id]/index';
import { MENSAGEM_INSUFICIENTE } from '@/components/GraficoEvolucao';
import { inserirPaciente } from '@/database/pacientes';
import type { Patient } from '@/types/patient';

import { graficosDesenhados, limparGraficos } from '../helpers/mockGiftedCharts';
import { avaliacaoSalto, gravarNoHistorico, lsi, perna } from '../helpers/historicoDeTeste';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

function abrirPerfil(id: string) {
  return renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'patient/[id]/index': TelaPerfilPaciente,
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

async function gravar(pacienteId: string, ...avaliacoes: ReturnType<typeof avaliacaoSalto>[]) {
  for (const a of avaliacoes) await gravarNoHistorico(bancoDaTela(), pacienteId, a);
}

const pontosDesenhados = (props: Record<string, unknown>) =>
  (props.dataSet as { data: { value?: number }[] }[]).map(
    (d) => d.data.filter((p) => p.value !== undefined).length,
  );

describe('perfil: gráficos de evolução', () => {
  beforeEach(async () => {
    limparGraficos();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('3 CMJ bilaterais e 2 Drop Jumps viram dois cartões, com 3 e 2 pontos', async () => {
    const ana = await cadastrarAna();
    await gravar(
      ana.id,
      avaliacaoSalto('cmj_bi', '2026-10-01T10:00', { unica: perna(30) }),
      avaliacaoSalto('dj', '2026-10-05T10:00', { unica: perna(25, 1.2) }),
      avaliacaoSalto('cmj_bi', '2026-10-15T10:00', { unica: perna(31) }),
      avaliacaoSalto('dj', '2026-10-20T10:00', { unica: perna(26, 1.3) }),
      avaliacaoSalto('cmj_bi', '2026-11-01T10:00', { unica: perna(32) }),
    );
    await abrirPerfil(ana.id);

    const cmj = await screen.findByTestId('grafico-cmj_bi');
    const dj = screen.getByTestId('grafico-dj');
    expect(within(cmj).getByText('CMJ Bilateral · Altura do salto')).toBeOnTheScreen();
    expect(within(dj).getByText('Drop Jump · RSI')).toBeOnTheScreen();
    expect(screen.queryByTestId('grafico-lsi')).toBeNull();
    await waitFor(() => expect(graficosDesenhados.length).toBeGreaterThanOrEqual(2));
    const contagens = graficosDesenhados.slice(-2).map(pontosDesenhados).flat();
    expect(contagens.sort()).toEqual([2, 3]);
  });

  it('uma avaliação só mostra a mensagem de insuficiência', async () => {
    const ana = await cadastrarAna();
    await gravar(ana.id, avaliacaoSalto('cmj_bi', '2026-10-01T10:00', { unica: perna(30) }));
    await abrirPerfil(ana.id);

    const cartao = await screen.findByTestId('grafico-cmj_bi');
    expect(within(cartao).getByText(MENSAGEM_INSUFICIENTE)).toBeOnTheScreen();
  });

  it('sem avaliações, não há gráfico e a lista vazia continua', async () => {
    const ana = await cadastrarAna();
    await abrirPerfil(ana.id);

    expect(await screen.findByText('Nenhuma avaliação ainda.')).toBeOnTheScreen();
    expect(screen.queryByText('Evolução')).toBeNull();
  });

  it('CMJ e Drop Jump unilaterais trazem o cartão da simetria por último, com duas linhas e a referência (CA01)', async () => {
    const ana = await cadastrarAna();
    const uni = (protocolo: 'cmj_uni' | 'dj_uni', data: string, valor: number) =>
      avaliacaoSalto(
        protocolo,
        data,
        { direita: perna(20, 1), esquerda: perna(24, 1.2) },
        { lsi: lsi(valor, protocolo === 'cmj_uni' ? 'altura' : 'rsi') },
      );
    await gravar(
      ana.id,
      uni('cmj_uni', '2026-10-01T10:00', 80),
      uni('dj_uni', '2026-10-05T10:00', 82),
      uni('cmj_uni', '2026-10-15T10:00', 85),
      uni('dj_uni', '2026-10-20T10:00', 88),
      uni('cmj_uni', '2026-11-01T10:00', 91),
    );
    await abrirPerfil(ana.id);

    const lsiCartao = await screen.findByTestId('grafico-lsi');
    expect(within(lsiCartao).getByText('Simetria (LSI) · LSI')).toBeOnTheScreen();
    expect(within(lsiCartao).getByText('LSI por altura (CMJ)')).toBeOnTheScreen();
    expect(within(lsiCartao).getByText('LSI por RSI (Drop Jump)')).toBeOnTheScreen();
    const ids = screen.getAllByTestId(/^grafico-(cmj|dj|lsi)/).map((e) => e.props.testID);
    expect(ids[ids.length - 1]).toBe('grafico-lsi');
    await waitFor(() =>
      expect(
        graficosDesenhados.some(
          (p) => p.showReferenceLine1 === true && p.referenceLine1Position === 90,
        ),
      ).toBe(true),
    );
  });

  it('o histórico continua abaixo dos gráficos e o toque abre a avaliação', async () => {
    const ana = await cadastrarAna();
    await gravar(ana.id, avaliacaoSalto('cmj_bi', '2026-10-01T10:00', { unica: perna(30) }));
    await abrirPerfil(ana.id);

    const itens = await screen.findAllByRole('button', { name: /CMJ Bilateral/ });
    await fireEvent.press(itens[0]);
    expect(await screen.findByText('Avaliação salva')).toBeOnTheScreen();
  });
});
