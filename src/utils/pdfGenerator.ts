import cores from '@/theme/cores';
import { SIMBOLO_JUMPLAB_SVG } from '@/theme/marca';
import type { PernaTentativa } from '@/types/attempt';
import type { ResumoLsi, ResumoPerna } from '@/types/resultadoSalto';
import { corLsi } from '@/utils/biomechanics';
import type { DadosLaudo } from '@/utils/dadosLaudo';
import { paraBr } from '@/utils/datas';
import type { ProtocoloSalto } from '@/utils/evolucao';
import {
  CASAS_ALTURA,
  CASAS_LSI,
  CASAS_MARGEM,
  CASAS_RSI,
  CASAS_TEMPO_MS,
  formatarDecimal,
} from '@/utils/formatacao';
import { montarSvgGrafico } from '@/utils/graficoSvg';
import { escaparHtml } from '@/utils/html';
import { estiloDoLaudo } from '@/utils/estiloLaudo';
import { PROTOCOLOS } from '@/utils/protocolos';
import { ROTULO_PERFIL, ROTULO_PERNA } from '@/utils/rotulos';
import { TENTATIVAS_POR_PERNA } from '@/utils/tentativas';

export { montarDadosLaudo, type DadosLaudo } from '@/utils/dadosLaudo';
export { escaparHtml } from '@/utils/html';

export const AVISO_LAUDO =
  'Este laudo não substitui avaliação profissional. Medidas por análise de vídeo, com margem de ±1 quadro.';
export const TEXTO_LSI_NAO_CALCULAVEL =
  'Não foi possível calcular o LSI: a perna de referência mediu zero.';

const TAMANHO_DATA = 'AAAA-MM-DD'.length;

function cabecalho({ avaliador, avaliacao }: DadosLaudo): string {
  const nome = avaliador.nome ? escaparHtml(avaliador.nome) : 'JumpLab';
  const registro = avaliador.registro
    ? `<p class="apoio">${escaparHtml(avaliador.registro)}</p>`
    : '';
  const sufixo = avaliador.nome ? ' · JumpLab' : '';
  return `<header>
  <div class="identidade"><div class="simbolo">${SIMBOLO_JUMPLAB_SVG}</div>
    <div><p class="avaliador">${nome}</p>${registro}<p class="secundario">Avaliação biomecânica${sufixo}</p></div></div>
  <p class="secundario data">${paraBr(avaliacao.dataHora.slice(0, TAMANHO_DATA))}</p>
</header>`;
}

function dadosDaAvaliacao({ paciente, avaliacao }: DadosLaudo): string {
  const baixa = avaliacao.resumo.baixaPrecisao ? ' (baixa precisão)' : '';
  const linhas: [string, string][] = [
    ['Protocolo', `<b>${escaparHtml(PROTOCOLOS[avaliacao.protocolo].nome)}</b>`],
    ['Paciente', escaparHtml(paciente.nome)],
    ['Idade', `${paciente.idadeNaAvaliacao} anos`],
    ['Perfil', ROTULO_PERFIL[paciente.perfil]],
    ['Perna lesionada', ROTULO_PERNA[avaliacao.pernaLesionada]],
    ['FPS', `${avaliacao.fps.join(' / ')} fps${baixa}`],
  ];
  const celulas = linhas.map(
    ([rotulo, valor]) => `<span class="secundario">${rotulo}</span><span>${valor}</span>`,
  );
  return `<div class="dados">${celulas.join('')}</div>`;
}

function pernasDoLaudo(protocolo: ProtocoloSalto): PernaTentativa[] {
  return PROTOCOLOS[protocolo].unilateral ? ['direita', 'esquerda'] : ['unica'];
}

function rotuloColuna(perna: PernaTentativa): string {
  return perna === 'unica' ? 'Resultado' : ROTULO_PERNA[perna];
}

function tabelaDeMedidas({ avaliacao }: DadosLaudo): string {
  const pernas = pernasDoLaudo(avaliacao.protocolo);
  const medidas = pernas.map((p) => avaliacao.resumo.pernas[p] as ResumoPerna);
  const linha = (rotulo: string, valor: (m: ResumoPerna) => string) =>
    `<tr><td>${rotulo}</td>${medidas.map((m) => `<td class="numero">${valor(m)}</td>`).join('')}</tr>`;
  const linhas = [
    linha(
      'Altura (cm)',
      (m) =>
        `${formatarDecimal(m.alturaCm, CASAS_ALTURA)} ±${formatarDecimal(m.margemCm, CASAS_MARGEM)}`,
    ),
    linha('Tempo de voo (ms)', (m) => formatarDecimal(m.tempoVooMs, CASAS_TEMPO_MS)),
  ];
  if (PROTOCOLOS[avaliacao.protocolo].dropJump) {
    const ouTraco = (v: number | null, casas: number) =>
      v === null ? '-' : formatarDecimal(v, casas);
    linhas.push(linha('Tempo de contato (ms)', (m) => ouTraco(m.tempoContatoMs, CASAS_TEMPO_MS)));
    linhas.push(linha('RSI', (m) => ouTraco(m.rsi, CASAS_RSI)));
  }
  const titulos = pernas.map((p) => `<th class="numero">${rotuloColuna(p)}</th>`).join('');
  return `<table><thead><tr><th>Medida</th>${titulos}</tr></thead><tbody>${linhas.join('')}</tbody></table>`;
}

function alturasDasTentativas({ avaliacao }: DadosLaudo): string {
  const unilateral = PROTOCOLOS[avaliacao.protocolo].unilateral;
  const partes = pernasDoLaudo(avaliacao.protocolo).map((perna) => {
    const alturas = (avaliacao.resumo.pernas[perna]?.tentativas ?? []).map((t) =>
      formatarDecimal(t.alturaCm, CASAS_ALTURA),
    );
    const rotulo = perna === 'unica' ? '' : `${ROTULO_PERNA[perna]} `;
    return `${rotulo}${alturas.join(' / ')} cm`;
  });
  const porPerna = unilateral ? ' por perna' : '';
  return `<p class="secundario nota">Média de ${TENTATIVAS_POR_PERNA} tentativas${porPerna}. Alturas: ${partes.join('; ')}.</p>`;
}

function blocoLsi(lsi: ResumoLsi | null): string {
  if (!lsi) return '';
  const cor = cores.papel.lsi[corLsi(lsi.valor)];
  const estilo = `background:${cor.fundo};color:${cor.texto}`;
  if (lsi.valor === null) return `<p class="lsi" style="${estilo}">${TEXTO_LSI_NAO_CALCULAVEL}</p>`;
  const base = lsi.base === 'rsi' ? 'RSI' : 'altura';
  const fraca =
    lsi.modo === 'mais_fraca' && lsi.pernaMaisFraca
      ? ` · perna mais fraca: ${ROTULO_PERNA[lsi.pernaMaisFraca].toLowerCase()}`
      : '';
  return `<p class="lsi" style="${estilo}">LSI ${formatarDecimal(lsi.valor, CASAS_LSI)}% (base: ${base})${fraca}</p>`;
}

function observacoes(texto: string): string {
  return texto.trim() ? `<p class="observacoes"><b>Observações:</b> ${escaparHtml(texto)}</p>` : '';
}

function evolucao({ evolucao: e, avaliacao }: DadosLaudo): string {
  if (!e.protocolo) return '';
  const titulo = `Evolução: ${escaparHtml(PROTOCOLOS[avaliacao.protocolo].nome)} · ${escaparHtml(e.protocolo.medida)}`;
  const lsi = e.lsi
    ? `<p class="titulo-grafico">Evolução da simetria (LSI)</p>${montarSvgGrafico(e.lsi)}`
    : '';
  return `<section class="evolucao"><p class="titulo-grafico">${titulo}</p>${montarSvgGrafico(e.protocolo)}${lsi}</section>`;
}

/** HTML completo do laudo (A4, papel branco com o verde da marca, D16). Sem vídeo (D14). */
export function montarHtmlLaudo(dados: DadosLaudo): string {
  const corpo = [
    cabecalho(dados),
    dadosDaAvaliacao(dados),
    tabelaDeMedidas(dados),
    alturasDasTentativas(dados),
    blocoLsi(dados.avaliacao.resumo.lsi),
    observacoes(dados.avaliacao.observacoes),
    evolucao(dados),
    `<footer>${AVISO_LAUDO}</footer>`,
  ].join('\n');
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${estiloDoLaudo()}</style></head><body>${corpo}</body></html>`;
}
