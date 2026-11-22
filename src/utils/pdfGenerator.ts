import cores from '@/theme/cores';
import { SIMBOLO_JUMPLAB_SVG } from '@/theme/marca';
import type { PernaTentativa } from '@/types/attempt';
import type { ResumoSalto } from '@/types/assessment';
import type { ResumoLsi, ResumoPerna } from '@/types/resultadoSalto';
import type { ResumoAgachamento } from '@/types/squat';
import { corLsi, corPerda } from '@/utils/biomechanics';
import type { DadosLaudo } from '@/utils/dadosLaudo';
import { paraBr } from '@/utils/datas';
import type { ProtocoloSalto } from '@/utils/evolucao';
import {
  CASAS_ALTURA,
  CASAS_AMPLITUDE,
  formatarCarga,
  CASAS_LSI,
  CASAS_MARGEM,
  CASAS_PERDA,
  CASAS_POTENCIA,
  CASAS_RSI,
  CASAS_TEMPO_AGACH_S,
  CASAS_TEMPO_MS,
  CASAS_VELOCIDADE,
  formatarDecimal,
} from '@/utils/formatacao';
import {
  montarHtmlTabelaLocais,
  montarSvgGrafico,
  montarSvgMapaMuscular,
  montarSvgRepeticoes,
} from '@/utils/graficoSvg';
import { consolidarGrupos, ROTULO_GRUPO } from '@/utils/melhorias';
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
  const baixa =
    avaliacao.resumo.tipo === 'salto' && avaliacao.resumo.baixaPrecisao ? ' (baixa precisão)' : '';
  const linhas: [string, string][] = [
    ['Protocolo', `<b>${escaparHtml(PROTOCOLOS[avaliacao.protocolo].nome)}</b>`],
    ['Paciente', escaparHtml(paciente.nome)],
    ['Idade', `${paciente.idadeNaAvaliacao} anos`],
    ['Perfil', ROTULO_PERFIL[paciente.perfil]],
    ['Perna lesionada', ROTULO_PERNA[avaliacao.pernaLesionada]],
    ...(avaliacao.cargaKg === null
      ? []
      : [['Carga', `${formatarCarga(avaliacao.cargaKg)} kg`] as [string, string]]),
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

function tabelaDeMedidas(protocolo: ProtocoloSalto, resumo: ResumoSalto): string {
  const pernas = pernasDoLaudo(protocolo);
  const medidas = pernas.map((p) => resumo.pernas[p] as ResumoPerna);
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
  if (PROTOCOLOS[protocolo].dropJump) {
    const ouTraco = (v: number | null, casas: number) =>
      v === null ? '-' : formatarDecimal(v, casas);
    linhas.push(linha('Tempo de contato (ms)', (m) => ouTraco(m.tempoContatoMs, CASAS_TEMPO_MS)));
    linhas.push(linha('RSI', (m) => ouTraco(m.rsi, CASAS_RSI)));
  }
  const titulos = pernas.map((p) => `<th class="numero">${rotuloColuna(p)}</th>`).join('');
  return `<table><thead><tr><th>Medida</th>${titulos}</tr></thead><tbody>${linhas.join('')}</tbody></table>`;
}

function alturasDasTentativas(protocolo: ProtocoloSalto, resumo: ResumoSalto): string {
  const unilateral = PROTOCOLOS[protocolo].unilateral;
  const partes = pernasDoLaudo(protocolo).map((perna) => {
    const alturas = (resumo.pernas[perna]?.tentativas ?? []).map((t) =>
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

/** Seção do agachamento (spec 014, RN11 e RN16): resumo, tabela por repetição, barras e perda. */
function secaoAgachamento(resumo: ResumoAgachamento): string {
  const perda =
    resumo.perdaVelocidadePct === null
      ? '-'
      : `${formatarDecimal(resumo.perdaVelocidadePct, CASAS_PERDA)}%`;
  const resumoLinha = `<div class="dados">
<span class="secundario">Carga</span><span>${formatarCarga(resumo.cargaKg)} kg</span>
<span class="secundario">Melhor velocidade</span><span><b>${formatarDecimal(resumo.melhorVelocidadeMs, CASAS_VELOCIDADE)} m/s</b></span>
<span class="secundario">Melhor potência</span><span>${formatarDecimal(resumo.melhorPotenciaW, CASAS_POTENCIA)} W</span>
<span class="secundario">Perda de velocidade</span><span>${perda}</span>
</div>`;
  const linhas = resumo.repeticoes
    .map(
      (r) =>
        `<tr><td>${r.numero}</td><td class="numero">${formatarDecimal(r.amplitudeCm, CASAS_AMPLITUDE)}</td><td class="numero">${formatarDecimal(r.subidaS, CASAS_TEMPO_AGACH_S)}</td><td class="numero">${formatarDecimal(r.velocidadeMs, CASAS_VELOCIDADE)}</td><td class="numero">${formatarDecimal(r.potenciaW, CASAS_POTENCIA)}</td></tr>`,
    )
    .join('');
  const tabela = `<table><thead><tr><th>Repetição</th><th class="numero">Amplitude (cm)</th><th class="numero">Subida (s)</th><th class="numero">Velocidade (m/s)</th><th class="numero">Potência (W)</th></tr></thead><tbody>${linhas}</tbody></table>`;
  const grafico = `<p class="titulo-grafico">Velocidade da subida por repetição (m/s)</p>${montarSvgRepeticoes(resumo.repeticoes, resumo.perdaVelocidadePct)}`;
  const corDaPerda = cores.papel.lsi[corPerda(resumo.perdaVelocidadePct)];
  const frase =
    resumo.perdaVelocidadePct === null
      ? ''
      : `<p class="lsi" style="background:${corDaPerda.fundo};color:${corDaPerda.texto}">Perda de velocidade da melhor para a última repetição: ${perda}</p>`;
  return resumoLinha + tabela + grafico + frase;
}

/** "O que melhorar" (spec 017): mapa, tabela dos locais e os pontos; omitido sem nenhum ponto. */
function secaoMelhorias({ avaliacao }: DadosLaudo): string {
  if (avaliacao.melhorias.length === 0) return '';
  const pontos = avaliacao.melhorias
    .map((p) => {
      const grupos = p.grupos.map((g) => ROTULO_GRUPO[g.grupo]).join(', ');
      const detalhe = [grupos, p.foco].filter(Boolean).map(escaparHtml).join(' · ');
      return `<li><b>${escaparHtml(p.titulo)}</b>${detalhe ? `<br><span class="secundario">${detalhe}</span>` : ''}</li>`;
    })
    .join('');
  return `<section class="evolucao"><p class="titulo-grafico">O que melhorar</p>${montarSvgMapaMuscular(consolidarGrupos(avaliacao.melhorias), avaliacao.protocolo)}${montarHtmlTabelaLocais(avaliacao.melhorias, avaliacao)}<ul>${pontos}</ul></section>`;
}

function medidas({ avaliacao }: DadosLaudo): string[] {
  const { resumo, protocolo } = avaliacao;
  if (resumo.tipo === 'agach' || protocolo === 'agach') {
    return resumo.tipo === 'agach' ? [secaoAgachamento(resumo)] : [];
  }
  return [
    tabelaDeMedidas(protocolo, resumo),
    alturasDasTentativas(protocolo, resumo),
    blocoLsi(resumo.lsi),
  ];
}

/** HTML completo do laudo (A4, papel branco com o verde da marca, D16). Sem vídeo (D14). */
export function montarHtmlLaudo(dados: DadosLaudo): string {
  const corpo = [
    cabecalho(dados),
    dadosDaAvaliacao(dados),
    ...medidas(dados),
    secaoMelhorias(dados),
    observacoes(dados.avaliacao.observacoes),
    evolucao(dados),
    `<footer>${AVISO_LAUDO}</footer>`,
  ].join('\n');
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${estiloDoLaudo()}</style></head><body>${corpo}</body></html>`;
}
