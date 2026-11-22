import type { Assessment, AvaliacaoDoHistorico, NovaAvaliacao } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import { SIMBOLO_JUMPLAB_SVG } from '@/theme/marca';
import {
  AVISO_LAUDO,
  escaparHtml,
  montarDadosLaudo,
  montarHtmlLaudo,
  TEXTO_LSI_NAO_CALCULAVEL,
} from '@/utils/pdfGenerator';
import { montarResumoSalto } from '@/utils/resumoAvaliacao';

import {
  CMJ_BILATERAL,
  CMJ_UNILATERAL,
  DROP_JUMP,
  novaAvaliacao,
  tresTentativas,
} from '../helpers/avaliacoesDeTeste';

const PACIENTE: Patient = {
  id: 'p-ana',
  nome: 'Ana Souza',
  dataNascimento: '1995-12-20',
  perfil: 'pos_lca',
  pernaLesionada: 'direita',
  dataLesao: '2026-05-20',
  criadoEm: '2026-01-01T00:00:00.000Z',
  atualizadoEm: '2026-01-01T00:00:00.000Z',
};
const AVALIADOR = { nome: 'Dra. Marina Costa', registro: 'CREFITO-12 000000-F' };
const SEM_AVALIADOR = { nome: '', registro: '' };

let sequencia = 0;
function salva(nova: NovaAvaliacao, observacoes = ''): Assessment {
  sequencia += 1;
  return {
    ...nova,
    id: `av-${sequencia}`,
    observacoes,
    resumo: montarResumoSalto(nova),
    criadoEm: nova.dataHora,
    atualizadoEm: nova.dataHora,
    pendenteSync: true,
  };
}

function noHistorico(a: Assessment): AvaliacaoDoHistorico {
  return {
    id: a.id,
    pacienteId: a.pacienteId,
    protocolo: a.protocolo,
    dataHora: a.dataHora,
    pernaLesionada: a.pernaLesionada,
    resumo: a.resumo,
    melhorias: a.melhorias,
  };
}

function cmjUni(dataHora: string, voo = 110) {
  return salva(
    novaAvaliacao(
      PACIENTE.id,
      'cmj_uni',
      [
        ...tresTentativas('direita', [voo, voo, voo]),
        ...tresTentativas('esquerda', [120, 120, 120]),
      ],
      { dataHora },
    ),
  );
}

function laudo(
  avaliacao: Assessment,
  historico: Assessment[] = [avaliacao],
  avaliador = AVALIADOR,
) {
  const dados = montarDadosLaudo(avaliacao, PACIENTE, historico.map(noHistorico), avaliador);
  return { dados, html: montarHtmlLaudo(dados) };
}

describe('laudo em PDF: dados e HTML', () => {
  it('CMJ unilateral com médias, alturas de cada tentativa e LSI iguais aos do resumo (CA01)', () => {
    const avaliacao = salva(novaAvaliacao(PACIENTE.id, 'cmj_uni', CMJ_UNILATERAL));
    const { html } = laudo(avaliacao);
    const { pernas, lsi } = avaliacao.resumo as ReturnType<typeof montarResumoSalto>;

    expect(html).toContain('<th class="numero">Direita</th><th class="numero">Esquerda</th>');
    const altura = (v: number) => v.toFixed(1).replace('.', ',');
    expect(html).toContain(`${altura(pernas.direita!.alturaCm)} ±`);
    expect(html).toContain(`${altura(pernas.esquerda!.alturaCm)} ±`);
    expect(html).toContain('Média de 3 tentativas por perna. Alturas: Direita ');
    expect(html).toContain(`LSI ${lsi!.valor!.toFixed(1).replace('.', ',')}% (base: altura)`);
  });

  it('60 fps marca baixa precisão no FPS e mostra a margem (CA02)', () => {
    const avaliacao = salva(
      novaAvaliacao(PACIENTE.id, 'cmj_bi', tresTentativas('unica', [30, 30, 30], 60)),
    );
    const { html, dados } = laudo(avaliacao);
    expect(dados.avaliacao.fps).toEqual([60]);
    expect(html).toContain('60 fps (baixa precisão)');
    expect(html).toMatch(/±\d+,\d/);
  });

  it('Drop Jump traz tempo de contato e RSI, sem LSI', () => {
    const { html } = laudo(salva(novaAvaliacao(PACIENTE.id, 'dj', DROP_JUMP)));
    expect(html).toContain('Tempo de contato (ms)');
    expect(html).toContain('<td>RSI</td>');
    expect(html).not.toContain('LSI ');
    expect(html).toContain('<th class="numero">Resultado</th>');
  });

  it('sem perna lesionada, o LSI indica a perna mais fraca', () => {
    const avaliacao = salva(
      novaAvaliacao(PACIENTE.id, 'cmj_uni', CMJ_UNILATERAL, { pernaLesionada: 'nenhuma' }),
    );
    expect(laudo(avaliacao).html).toContain('perna mais fraca: direita');
  });

  it('LSI nulo mostra o texto de não calculável', () => {
    const avaliacao = salva(novaAvaliacao(PACIENTE.id, 'cmj_uni', CMJ_UNILATERAL));
    const resumo = avaliacao.resumo as ReturnType<typeof montarResumoSalto>;
    const semLsi = { ...avaliacao, resumo: { ...resumo, lsi: { ...resumo.lsi!, valor: null } } };
    expect(laudo(semLsi).html).toContain(TEXTO_LSI_NAO_CALCULAVEL);
  });

  it('idade na data da avaliação, não na de hoje', () => {
    const avaliacao = salva(
      novaAvaliacao(PACIENTE.id, 'cmj_bi', CMJ_BILATERAL, { dataHora: '2026-11-22T10:30' }),
    );
    expect(laudo(avaliacao).dados.paciente.idadeNaAvaliacao).toBe(30);
  });

  it('evolução só com o mesmo paciente e até a data da avaliação (RN06, RN07)', () => {
    const antiga = cmjUni('2026-10-01T10:00', 100);
    const atual = cmjUni('2026-11-01T10:00', 110);
    const posterior = cmjUni('2026-12-01T10:00', 119);
    const deOutro = { ...cmjUni('2026-10-15T10:00', 90), pacienteId: 'p-bruno' };
    const { dados, html } = laudo(atual, [antiga, deOutro, atual, posterior]);

    expect(dados.evolucao.protocolo?.eixo).toEqual(['2026-10-01', '2026-11-01']);
    expect(dados.evolucao.lsi?.eixo).toEqual(['2026-10-01', '2026-11-01']);
    expect(html).not.toContain('15/10');
    expect(html).not.toContain('01/12');
  });

  it('unilateral traz o gráfico do protocolo e o do LSI; bilateral só o do protocolo', () => {
    const uni = laudo(cmjUni('2026-11-01T10:00'), [
      cmjUni('2026-10-01T10:00'),
      cmjUni('2026-11-01T10:00'),
    ]);
    expect(uni.html).toContain('Evolução: CMJ Unilateral · Altura do salto');
    expect(uni.html).toContain('Evolução da simetria (LSI)');

    const bi1 = salva(
      novaAvaliacao(PACIENTE.id, 'cmj_bi', CMJ_BILATERAL, { dataHora: '2026-10-01T10:00' }),
    );
    const bi2 = salva(
      novaAvaliacao(PACIENTE.id, 'cmj_bi', CMJ_BILATERAL, { dataHora: '2026-11-01T10:00' }),
    );
    const bi = laudo(bi2, [bi1, bi2]);
    expect(bi.html).toContain('Evolução: CMJ Bilateral');
    expect(bi.html).not.toContain('Evolução da simetria');
  });

  it('com uma única avaliação do protocolo, sem bloco de evolução e sem "insuficientes" (RN10)', () => {
    const avaliacao = cmjUni('2026-11-01T10:00');
    const { dados, html } = laudo(avaliacao);
    expect(dados.evolucao.protocolo).toBeNull();
    expect(dados.evolucao.lsi).toBeNull();
    expect(html).not.toContain('Evolução');
    expect(html).not.toContain('insuficientes');
  });

  it('dados da avaliação começam por Protocolo e o lado direito do cabeçalho só tem a data (RN10)', () => {
    const { html } = laudo(salva(novaAvaliacao(PACIENTE.id, 'cmj_bi', CMJ_BILATERAL)));
    expect(html).toMatch(
      /<div class="dados"><span class="secundario">Protocolo<\/span><span><b>CMJ Bilateral<\/b>/,
    );
    expect(html).toContain('<p class="secundario data">22/11/2026</p>');
  });

  it('observação vazia omite a seção; texto digitado é escapado', () => {
    expect(
      laudo(salva(novaAvaliacao(PACIENTE.id, 'cmj_bi', CMJ_BILATERAL), '  ')).html,
    ).not.toContain('Observações');
    const html = laudo(
      salva(novaAvaliacao(PACIENTE.id, 'cmj_bi', CMJ_BILATERAL), 'Valgo < 5° & pouso'),
    ).html;
    expect(html).toContain('Valgo &lt; 5° &amp; pouso');
    expect(escaparHtml(`<a href="x">'`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;');
  });

  it('aviso sempre presente e nada de vídeo', () => {
    const { html } = laudo(salva(novaAvaliacao(PACIENTE.id, 'cmj_bi', CMJ_BILATERAL)));
    expect(html).toContain(AVISO_LAUDO);
    expect(html.toLowerCase()).not.toMatch(/<video|\.mp4|file:\/\//);
  });

  it('cabeçalho com nome e registro, só com nome e só JumpLab, sempre com o símbolo à esquerda (FR-009, D16)', () => {
    const avaliacao = salva(novaAvaliacao(PACIENTE.id, 'cmj_bi', CMJ_BILATERAL));
    const completo = laudo(avaliacao, [avaliacao], AVALIADOR).html;
    const soNome = laudo(avaliacao, [avaliacao], { nome: 'Dra. Marina Costa', registro: '' }).html;
    const vazio = laudo(avaliacao, [avaliacao], SEM_AVALIADOR).html;

    expect(completo).toContain('Dra. Marina Costa</p><p class="apoio">CREFITO-12 000000-F</p>');
    expect(soNome).toContain('Dra. Marina Costa</p><p class="secundario">');
    expect(vazio).toContain('<p class="avaliador">JumpLab</p>');
    for (const html of [completo, soNome, vazio]) {
      const cabecalho = html.slice(html.indexOf('<header>'), html.indexOf('</header>'));
      expect(cabecalho.indexOf(SIMBOLO_JUMPLAB_SVG)).toBeLessThan(
        cabecalho.indexOf('class="avaliador"'),
      );
      expect(cabecalho).not.toContain('<img');
    }
  });

  it('papel branco e nenhum azul (FR-015)', () => {
    const { html } = laudo(salva(novaAvaliacao(PACIENTE.id, 'cmj_bi', CMJ_BILATERAL)));
    expect(html).toContain('background: #ffffff');
    expect(html.toLowerCase()).not.toContain('#2563eb');
  });
});
