import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Text, ToastAndroid } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaAvaliacaoSalva from '@/app/assessment/[id]';
import TelaResultado from '@/app/assessment/result';
import { inserirPaciente } from '@/database/pacientes';
import type { SquatSeries } from '@/types/squat';

import { SerieAgachamentoPronta } from '../helpers/rascunhoDeTeste';
import { repeticao, SERIE_CA01, SERIE_CA02 } from '../helpers/serieDeTeste';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('@/video/descartarVideos', () => ({ descartarVideos: jest.fn(() => Promise.resolve()) }));

/** CA02 com a última repetição na velocidade pedida (subida de 0,5 s, 1,3 px/cm). */
function serieComUltima(velocidadeMs: number): SquatSeries {
  const amplitudePx = velocidadeMs * 50 * 1.3;
  return {
    ...SERIE_CA02,
    repeticoes: [
      SERIE_CA02.repeticoes[0],
      SERIE_CA02.repeticoes[1],
      repeticao([252, 200], [306, 200 + amplitudePx], [336, 200]),
    ],
  };
}

async function abrirResultado(serie: SquatSeries) {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Bruno Lima',
    dataNascimento: '1988-07-02',
    perfil: 'corredor',
    pernaLesionada: 'nenhuma',
    dataLesao: null,
  });
  const app = await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'patient/[id]/index': () => <Text>Perfil do paciente</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/analyze': () => (
        <SerieAgachamentoPronta pacienteId={paciente.id} cargaKg={60} serie={serie} />
      ),
      'assessment/result': TelaResultado,
      'assessment/[id]': TelaAvaliacaoSalva,
    },
    { initialUrl: `/patient/${paciente.id}` },
  );
  await act(async () => {
    const { router } = jest.requireActual('expo-router');
    router.push('/assessment/analyze');
  });
  await fireEvent.press(await screen.findByRole('button', { name: 'Ver resultado' }));
  await screen.findByRole('button', { name: 'Só salvar' });
  return app;
}

const classe = (testID: string) => String(screen.getByTestId(testID).props.className ?? '');

describe('resultado do agachamento', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('CA02: cartões, melhor 1,00 m/s e perda de 20,0% em verde; sem selo de baixa precisão', async () => {
    await abrirResultado(SERIE_CA02);

    expect(screen.getByText('Carga')).toBeOnTheScreen();
    expect(screen.getByText('Repetições')).toBeOnTheScreen();
    expect(screen.getAllByText('Melhor velocidade').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('20,0%')).toBeOnTheScreen();
    expect(screen.getByText('Melhor potência')).toBeOnTheScreen();
    expect(screen.getAllByText('1,00 m/s')).toHaveLength(3); // topo, cartão e barra da repetição 2
    expect(classe('barra-rep-3')).toContain('bg-lsi-verde');
    expect(screen.queryByText('Baixa precisão (60 fps)')).toBeNull();
    expect(screen.queryByTestId('cartao-lsi')).toBeNull();
  });

  it.each([
    [0.65, '35,0%', 'bg-lsi-amarelo'],
    [0.55, '45,0%', 'bg-lsi-vermelho'],
  ])('última a %p m/s: perda %s com a cor do semáforo', async (velocidade, texto, cor) => {
    await abrirResultado(serieComUltima(velocidade));
    expect(screen.getByText(texto)).toBeOnTheScreen();
    expect(classe('barra-rep-3')).toContain(cor);
  });

  it('uma repetição: perda "-" sem cor', async () => {
    await abrirResultado(SERIE_CA01);
    expect(screen.getByText('-')).toBeOnTheScreen();
  });

  it('tabela por repetição com amplitude, descida, subida e potência (CA01)', async () => {
    await abrirResultado(SERIE_CA01);
    const linha = screen.getByTestId('linha-rep-1');
    expect(within(linha).getByText('58,5 cm')).toBeOnTheScreen();
    expect(within(linha).getByText('0,90 s')).toBeOnTheScreen();
    expect(within(linha).getByText('0,62 s')).toBeOnTheScreen();
    expect(within(linha).getByText('558 W')).toBeOnTheScreen();
  });

  it('o topo mostra a melhor velocidade, com a dica de observação do agachamento', async () => {
    await abrirResultado(SERIE_CA02);
    const topo = screen.getByTestId('topo-parallax');
    expect(within(topo).getByText('Melhor velocidade')).toBeOnTheScreen();
    expect(topo).toHaveTextContent(/1,00 m\/s/);
    expect(screen.getByLabelText('Observações')).toHaveProp(
      'placeholder',
      'Profundidade, valgo, controle da descida...',
    );
  });

  it('salvar volta ao perfil e a avaliação reabre só leitura com os mesmos números', async () => {
    jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
    await abrirResultado(SERIE_CA02);

    await fireEvent.press(screen.getByRole('button', { name: 'Só salvar' }));
    expect(await screen.findByText('Perfil do paciente')).toBeOnTheScreen();

    const linha = await bancoDaTela().getFirstAsync<{ id: string }>('SELECT id FROM avaliacao');
    await act(async () => {
      const { router } = jest.requireActual('expo-router');
      router.push(`/assessment/${linha?.id}`);
    });

    expect(await screen.findByText('Somente leitura')).toBeOnTheScreen();
    expect(screen.getByText('20,0%')).toBeOnTheScreen();
    expect(screen.getAllByText('1,00 m/s')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Só salvar' })).toBeNull();
  });
});
