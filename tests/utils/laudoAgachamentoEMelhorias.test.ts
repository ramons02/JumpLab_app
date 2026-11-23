import type { Assessment, AvaliacaoDoHistorico } from '@/types/assessment';
import type { PontoMelhoria } from '@/types/melhoria';
import type { Patient } from '@/types/patient';
import { montarDadosLaudo, montarHtmlLaudo } from '@/utils/pdfGenerator';
import { montarResumoAgachamento, montarResumoSalto } from '@/utils/resumoAvaliacao';

import { CMJ_UNILATERAL, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { SERIE_CA01, SERIE_CA02 } from '../helpers/serieDeTeste';

const PACIENTE: Patient = {
  id: 'p-bruno',
  nome: 'Bruno Lima',
  dataNascimento: '1988-07-02',
  perfil: 'corredor',
  pernaLesionada: 'direita',
  dataLesao: null,
  criadoEm: '2026-01-01T00:00:00.000Z',
  atualizadoEm: '2026-01-01T00:00:00.000Z',
};
const AVALIADOR = { nome: 'Dra. Marina Costa', registro: 'CREFITO-12 000000-F' };

function salva(nova: ReturnType<typeof novaAvaliacao>, id: string): Assessment {
  const resumo =
    nova.protocolo === 'agach' ? montarResumoAgachamento(nova) : montarResumoSalto(nova);
  return {
    ...nova,
    id,
    observacoes: '',
    resumo,
    criadoEm: nova.dataHora,
    atualizadoEm: nova.dataHora,
    pendenteSync: true,
  };
}

const noHistorico = (a: Assessment): AvaliacaoDoHistorico => ({
  id: a.id,
  pacienteId: a.pacienteId,
  protocolo: a.protocolo,
  dataHora: a.dataHora,
  pernaLesionada: a.pernaLesionada,
  resumo: a.resumo,
  melhorias: a.melhorias,
});

function agach(serie = SERIE_CA02, extra: Partial<Assessment> = {}) {
  return {
    ...salva(
      novaAvaliacao(PACIENTE.id, 'agach', [], { cargaKg: 60, serie, pernaLesionada: 'nenhuma' }),
      'av-agach',
    ),
    ...extra,
  };
}

function laudo(avaliacao: Assessment) {
  const dados = montarDadosLaudo(avaliacao, PACIENTE, [noHistorico(avaliacao)], AVALIADOR);
  return { dados, html: montarHtmlLaudo(dados) };
}

describe('laudo do agachamento (spec 014, US4)', () => {
  it('traz carga, melhor velocidade, melhor potência, perda e a tabela por repetição', () => {
    const { html } = laudo(agach());
    expect(html).toContain('60 kg');
    expect(html).toContain('1,00 m/s');
    expect(html).toContain('Melhor potência');
    expect(html).toContain('<td class="numero">50,0</td>'); // amplitude da repetição 2
    expect(html).toContain('<td class="numero">0,50</td>'); // subida
  });

  it('depois da tabela, o gráfico de barras e a frase da perda', () => {
    const { html } = laudo(agach());
    const tabela = html.indexOf('Potência (W)');
    const titulo = html.indexOf('Velocidade da subida por repetição (m/s)');
    expect(titulo).toBeGreaterThan(tabela);
    expect(html.indexOf('<rect', titulo)).toBeGreaterThan(titulo);
    expect(html).toContain('Perda de velocidade da melhor para a última repetição: 20,0%');
  });

  it('uma repetição: sem a frase da perda', () => {
    const { html } = laudo(agach(SERIE_CA01));
    expect(html).not.toContain('Perda de velocidade da melhor para a última repetição');
  });

  it('sem LSI, altura de salto nem baixa precisão', () => {
    const { html } = laudo(agach());
    expect(html).not.toContain('LSI ');
    expect(html).not.toContain('Altura (cm)');
    expect(html).not.toContain('baixa precisão');
  });
});

describe('"O que melhorar" no laudo (spec 017, US3)', () => {
  it('agachamento com perda de 32,3%: o quadro com resistência de força, mapa e tabela', () => {
    const avaliacao = agach();
    const resumo = avaliacao.resumo.tipo === 'agach' ? avaliacao.resumo : null;
    const comPerda = { ...avaliacao, resumo: { ...resumo!, perdaVelocidadePct: 32.3 } };
    const { dados, html } = laudo(comPerda);

    expect(dados.avaliacao.melhorias.map((p) => p.titulo)).toEqual(['Resistência de força']);
    expect(html).toContain('O que melhorar');
    expect(html).toContain('Mapa muscular das pernas');
    expect(html).toContain('Quadril (ambas)');
    expect(html).toContain('Resistência de força');
  });

  it('usa os pontos gravados quando existem', () => {
    const gravados: PontoMelhoria[] = [
      {
        titulo: 'Mobilidade de tornozelo',
        grupos: [],
        motivo: 'citado pelo avaliador',
        foco: '',
        origem: 'avaliador',
      },
    ];
    const avaliacao = salva(
      { ...novaAvaliacao(PACIENTE.id, 'cmj_uni', CMJ_UNILATERAL), melhorias: gravados },
      'av-cmj',
    );
    const { dados, html } = laudo(avaliacao);
    expect(dados.avaliacao.melhorias).toEqual(gravados);
    expect(html).toContain('Mobilidade de tornozelo');
    expect(html).not.toContain('Força e potência');
  });

  it('o quadro vem entre o LSI e as observações, e some sem nenhum ponto', () => {
    const avaliacao = {
      ...salva(novaAvaliacao(PACIENTE.id, 'cmj_uni', CMJ_UNILATERAL), 'av-cmj2'),
      observacoes: 'Boa estabilidade.',
    };
    const { html } = laudo(avaliacao);
    const lsi = html.indexOf('class="lsi"');
    const quadro = html.indexOf('O que melhorar');
    expect(quadro).toBeGreaterThan(lsi);
    expect(html.indexOf('Observações:')).toBeGreaterThan(quadro);

    const semPontos = laudo({ ...avaliacao, melhorias: [] }).html;
    expect(semPontos).not.toContain('O que melhorar');
  });

  it('nenhum exercício no laudo', () => {
    const { html } = laudo(salva(novaAvaliacao(PACIENTE.id, 'cmj_uni', CMJ_UNILATERAL), 'av-cmj3'));
    for (const exercicio of ['leg press', 'búlgaro', 'stiff', 'afundo']) {
      expect(html.toLowerCase()).not.toContain(exercicio);
    }
  });
});

describe('quebra de página do laudo', () => {
  it('título e gráfico no mesmo bloco, sem quebra dentro de bloco, tabela nem local', () => {
    const { html } = laudo(
      salva(novaAvaliacao(PACIENTE.id, 'cmj_uni', CMJ_UNILATERAL), 'av-quebra'),
    );
    expect(html).toContain('.bloco, tbody, tr { break-inside: avoid; page-break-inside: avoid; }');
    expect(html).toMatch(/<div class="bloco"><p class="titulo-grafico">O que melhorar<\/p><svg/);
    expect(html).toContain('<table class="bloco"><thead><tr><th>Local</th>');
    // cada local vem num tbody próprio, com a linha do motivo junto
    expect(html).toMatch(/<tbody><tr><td>1 · Quadril[^]*?<\/tr><tr><td colspan="5"[^]*?<\/tbody>/);
  });

  it('agachamento: o título do gráfico de barras fica junto do gráfico', () => {
    const { html } = laudo(agach());
    expect(html).toMatch(
      /<div class="bloco"><p class="titulo-grafico">Velocidade da subida por repetição \(m\/s\)<\/p><svg/,
    );
  });
});
