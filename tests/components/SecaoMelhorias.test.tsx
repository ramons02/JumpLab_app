import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';

import { SecaoMelhorias } from '@/components/SecaoMelhorias';
import type { AvaliacaoDoHistorico } from '@/types/assessment';
import type { PontoMelhoria } from '@/types/melhoria';
import { sugerirMelhorias } from '@/utils/melhorias';

import { avaliacaoAgachamento, avaliacaoSalto, perna } from '../helpers/historicoDeTeste';

const CMJ_UNI = avaliacaoSalto(
  'cmj_uni',
  '2026-11-22T10:00',
  { direita: perna(26), esquerda: perna(30) },
  {
    lsi: { valor: 86.9, base: 'altura', modo: 'lesionada', pernaMaisFraca: null },
    pernaLesionada: 'direita',
  },
);

function agachamentoComPerda(perda: number): AvaliacaoDoHistorico {
  const a = avaliacaoAgachamento('2026-11-22T10:00', 0.9);
  return a.resumo.tipo === 'agach'
    ? { ...a, resumo: { ...a.resumo, perdaVelocidadePct: perda } }
    : a;
}

const sugerir = (a: AvaliacaoDoHistorico) => sugerirMelhorias(a.resumo, a.pernaLesionada);

function Editavel({
  inicial,
  avaliacao,
}: {
  inicial: PontoMelhoria[];
  avaliacao: AvaliacaoDoHistorico;
}) {
  const [pontos, setPontos] = useState(inicial);
  return <SecaoMelhorias pontos={pontos} avaliacao={avaliacao} editavel aoMudar={setPontos} />;
}

describe('SecaoMelhorias (só exibição)', () => {
  it('com pontos: mapa com marcadores e legenda, tabela com "!" e "✓", razão e motivo, e os pontos', async () => {
    await render(<SecaoMelhorias pontos={sugerir(CMJ_UNI)} avaliacao={CMJ_UNI} />);

    expect(
      screen.getByLabelText('Mapa muscular das pernas, de frente e de costas'),
    ).toBeOnTheScreen();
    expect(screen.getAllByTestId('marcador-local-3').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByTestId('marcador-local-5')).toHaveLength(0); // panturrilha não avaliada no CMJ
    expect(
      screen.getAllByTestId('musculo-quadriceps-direita-melhorar').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('musculo-quadriceps-esquerda-ok').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText('não avaliado')).toBeOnTheScreen();

    const coxaDireita = screen.getByTestId('linha-local-coxa-direita');
    expect(within(coxaDireita).getByLabelText('Melhorar')).toBeOnTheScreen();
    expect(within(coxaDireita).getByText('86,9%')).toBeOnTheScreen();
    expect(within(coxaDireita).getByText('LSI 86,9% (bom a partir de 90%)')).toBeOnTheScreen();
    const coxaEsquerda = screen.getByTestId('linha-local-coxa-esquerda');
    expect(within(coxaEsquerda).getByLabelText('Ok')).toBeOnTheScreen();
    expect(within(coxaEsquerda).getByText('100,0%')).toBeOnTheScreen();

    expect(screen.getByText('Força e potência da perna direita (lesionada)')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Remover ponto/ })).toBeNull();
    expect(screen.queryByLabelText('Acrescentar ponto')).toBeNull();
  });

  it('agachamento: uma linha "(ambas)" por local', async () => {
    const a = agachamentoComPerda(32.3);
    await render(<SecaoMelhorias pontos={sugerir(a)} avaliacao={a} />);

    expect(screen.getByTestId('linha-local-quadril-ambas')).toBeOnTheScreen();
    expect(screen.getByTestId('linha-local-coxa-ambas')).toBeOnTheScreen();
    expect(screen.getByText('Quadril (ambas)')).toBeOnTheScreen();
    expect(screen.getAllByText('67,7%')).toHaveLength(2);
  });

  it('sem pontos: mensagem e nenhum mapa', async () => {
    const a = agachamentoComPerda(10);
    await render(<SecaoMelhorias pontos={[]} avaliacao={a} />);

    expect(
      screen.getByText('Nenhum ponto abaixo das referências nesta avaliação.'),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Mapa muscular das pernas, de frente e de costas')).toBeNull();
  });
});

describe('SecaoMelhorias (editável)', () => {
  it('remove uma sugestão', async () => {
    await render(<Editavel inicial={sugerir(CMJ_UNI)} avaliacao={CMJ_UNI} />);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Remover ponto Força e potência da perna direita (lesionada)',
      }),
    );

    expect(
      screen.getByText('Nenhum ponto abaixo das referências nesta avaliação.'),
    ).toBeOnTheScreen();
  });

  it('inclui um ponto livre; o grupo reconhecido acende no mapa; vazio não inclui', async () => {
    await render(<Editavel inicial={[]} avaliacao={CMJ_UNI} />);
    expect(screen.getByRole('button', { name: 'Incluir' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Acrescentar ponto'), 'Glúteo médio');
    await fireEvent.press(screen.getByRole('button', { name: 'Incluir' }));

    expect(screen.getAllByText('Glúteo médio')).toHaveLength(2); // título e grupo reconhecido
    expect(
      screen.getAllByTestId('musculo-gluteo_medio-direita-melhorar').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByTestId('musculo-gluteo_medio-esquerda-melhorar').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('citado pelo avaliador').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Acrescentar ponto')).toHaveDisplayValue('');
  });
});
