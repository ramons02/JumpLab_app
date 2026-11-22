import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaAvaliacaoSalva, { MENSAGEM_ERRO_PDF } from '@/app/assessment/[id]';
import { salvarAvaliacao } from '@/database/avaliacoes';
import { inserirPaciente } from '@/database/pacientes';
import type { Assessment } from '@/types/assessment';
import { formatarDecimal } from '@/utils/formatacao';
import { montarResumoSalto } from '@/utils/resumoAvaliacao';

import { CMJ_UNILATERAL, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { laudo, reiniciarLaudo } from '../helpers/mocksLaudo';
import { bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));
jest.mock('expo-print', () => jest.requireActual('../helpers/mocksLaudo').moduloPrint);
jest.mock('expo-sharing', () => jest.requireActual('../helpers/mocksLaudo').moduloSharing);

async function gravarEAbrir(): Promise<Assessment> {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: 'pos_lca',
    pernaLesionada: 'direita',
    dataLesao: '2026-05-20',
  });
  const nova = novaAvaliacao(paciente.id, 'cmj_uni', CMJ_UNILATERAL);
  const salva = await salvarAvaliacao(bancoDaTela(), nova, montarResumoSalto(nova), 'Leve valgo.');
  await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/[id]': TelaAvaliacaoSalva,
    },
    { initialUrl: `/assessment/${salva.id}` },
  );
  await screen.findByRole('button', { name: 'Compartilhar PDF' });
  return salva;
}

const botao = () => screen.getByRole('button', { name: 'Compartilhar PDF' });

describe('Compartilhar PDF da avaliação salva', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    reiniciarLaudo();
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  it('gera o laudo com os números do resumo e abre a folha com o PDF', async () => {
    const salva = await gravarEAbrir();
    await fireEvent.press(botao());

    await waitFor(() => expect(laudo.compartilhados).toHaveLength(1));
    const resumo = salva.resumo as ReturnType<typeof montarResumoSalto>;
    expect(laudo.htmls[0]).toContain(formatarDecimal(resumo.pernas.direita!.alturaCm, 1));
    expect(laudo.htmls[0]).toContain(`LSI ${formatarDecimal(resumo.lsi!.valor!, 1)}%`);
    expect(laudo.htmls[0]).toContain('Leve valgo.');
    expect(laudo.compartilhados[0]).toEqual({
      uri: 'file:///cache/Print/laudo-1.pdf',
      opcoes: expect.objectContaining({ mimeType: 'application/pdf' }),
    });
  });

  it('falha ao gerar mostra a mensagem', async () => {
    laudo.falharAoGerar = true;
    await gravarEAbrir();

    await fireEvent.press(botao());

    expect(await screen.findByText(MENSAGEM_ERRO_PDF)).toBeOnTheScreen();
    expect(laudo.compartilhados).toHaveLength(0);
  });
});
