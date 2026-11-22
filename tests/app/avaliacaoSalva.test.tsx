import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaAvaliacaoSalva from '@/app/assessment/[id]';
import { salvarAvaliacao } from '@/database/avaliacoes';
import { inserirPaciente } from '@/database/pacientes';
import type { Assessment } from '@/types/assessment';
import * as resumoAvaliacao from '@/utils/resumoAvaliacao';

import { CMJ_UNILATERAL, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

async function gravarAvaliacao(): Promise<Assessment> {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: 'pos_lca',
    pernaLesionada: 'direita',
    dataLesao: '2026-05-20',
  });
  const nova = novaAvaliacao(paciente.id, 'cmj_uni', CMJ_UNILATERAL);
  return salvarAvaliacao(
    bancoDaTela(),
    nova,
    resumoAvaliacao.montarResumoSalto(nova),
    'Leve valgo no pouso.',
  );
}

function abrir(id: string) {
  return renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/[id]': TelaAvaliacaoSalva,
    },
    { initialUrl: `/assessment/${id}` },
  );
}

describe('avaliação salva (só leitura)', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('mostra os valores guardados, o selo e a observação, sem botão de salvar nem recálculo', async () => {
    const salva = await gravarAvaliacao();
    const montar = jest.spyOn(resumoAvaliacao, 'montarResumoSalto');

    await abrir(salva.id);

    expect(await screen.findByText('Somente leitura')).toBeOnTheScreen();
    expect(within(screen.getByTestId('cartao-lsi')).getByText('84,0%')).toBeOnTheScreen();
    expect(screen.getByText('Perna direita (lesionada)')).toBeOnTheScreen();
    expect(screen.getByTestId('observacoes')).toHaveTextContent('Leve valgo no pouso.');
    expect(screen.queryByLabelText('Observações')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Só salvar' })).toBeNull();
    expect(montar).not.toHaveBeenCalled();
  });

  it('o topo mostra a altura da perna lesionada guardada', async () => {
    const salva = await gravarAvaliacao();
    await abrir(salva.id);

    const topo = await screen.findByTestId('topo-parallax');
    expect(within(topo).getByText('Altura · perna lesionada')).toBeOnTheScreen();
    expect(topo).toHaveTextContent(/25,8 cm/);
  });

  it('id inexistente mostra a mensagem e volta', async () => {
    await abrir('00000000-0000-4000-8000-000000000000');

    expect(await screen.findByText('Avaliação não encontrada.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByText('Tela de pacientes')).toBeOnTheScreen();
  });

  it('id inválido também mostra a mensagem', async () => {
    await abrir('nao-e-uuid');
    expect(await screen.findByText('Avaliação não encontrada.')).toBeOnTheScreen();
  });

  it('mostra "O que melhorar" com os pontos gravados, só leitura', async () => {
    const salva = await gravarAvaliacao();
    await bancoDaTela().runAsync(
      'UPDATE avaliacao SET melhorias_json = ? WHERE id = ?',
      JSON.stringify([
        {
          titulo: 'Glúteo médio',
          grupos: [],
          motivo: 'citado pelo avaliador',
          foco: '',
          origem: 'avaliador',
        },
      ]),
      salva.id,
    );
    await abrir(salva.id);

    expect(await screen.findByText('O que melhorar')).toBeOnTheScreen();
    expect(screen.getByText('Glúteo médio')).toBeOnTheScreen();
    expect(screen.queryByText(/Força e potência/)).toBeNull();
    expect(screen.queryByLabelText('Acrescentar ponto')).toBeNull();
  });

  it('avaliação antiga (sem pontos gravados) mostra as sugestões calculadas na hora', async () => {
    const salva = await gravarAvaliacao(); // LSI 84,0% com a direita lesionada
    await abrir(salva.id);

    expect(
      await screen.findByText('Força e potência da perna direita (lesionada)'),
    ).toBeOnTheScreen();
  });
});
