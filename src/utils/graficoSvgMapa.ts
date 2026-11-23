import cores from '@/theme/cores';
import type { GruposConsolidados, PontoMelhoria } from '@/types/melhoria';
import type { Protocol } from '@/types/protocol';
import {
  ALTURA_MAPA,
  CENTRO_COSTAS,
  CENTRO_FRENTE,
  CONTORNO_PERNA,
  CONTORNO_QUADRIL,
  DETALHES_COSTAS,
  DETALHES_FRENTE,
  LARGURA_MAPA,
  ladoDoDesenho,
  MARCADOR,
  MUSCULOS_COSTAS,
  MUSCULOS_FRENTE,
  TOPO_MAPA,
} from '@/utils/desenhoMapa';
import { dataHoraParaBr } from '@/utils/datas';
import { CASAS_LSI, formatarDecimal } from '@/utils/formatacao';
import { escaparHtml } from '@/utils/html';
import {
  estadoDoGrupo,
  estadoDoLocal,
  explicacaoDaRazao,
  gruposAvaliados,
  linhasDaTabela,
  LOCAIS_MAPA,
  medidaDoLado,
  razaoDoLado,
  ROTULO_GRUPO,
  type AvaliacaoParaMelhorias,
} from '@/utils/melhorias';
import { ROTULO_PERNA } from '@/utils/rotulos';

const COR = cores.papel.mapa;

function vista(cx: number, frente: boolean, grupos: GruposConsolidados, protocolo: Protocol) {
  const avaliados = gruposAvaliados(protocolo);
  const musculos = frente ? MUSCULOS_FRENTE : MUSCULOS_COSTAS;
  const pernas = [-1, 1].map((sinal) => {
    const lado = ladoDoDesenho(sinal, frente);
    const detalhes = (frente ? DETALHES_FRENTE : DETALHES_COSTAS)
      .map(
        (d) =>
          `<path d="${d}" fill="${COR.neutro.fundo}" stroke="${COR.neutro.fibra}" stroke-width="0.6"/>`,
      )
      .join('');
    const joelho = frente
      ? `<ellipse cx="20" cy="130" rx="6" ry="5" fill="none" stroke="${COR.contorno}" stroke-width="0.8"/>`
      : '';
    const desenhados = musculos
      .map((m) => {
        const estado = estadoDoGrupo(grupos, avaliados, m.grupo, lado);
        const fibras = m.fibras
          .map(
            (f) =>
              `<path d="${f}" fill="none" stroke="${COR[estado].fibra}" stroke-width="0.7" opacity="0.7"/>`,
          )
          .join('');
        return `<g data-grupo="${m.grupo}" data-lado="${lado}" data-estado="${estado}"><path d="${m.d}" fill="${COR[estado].fundo}" stroke="${COR[estado].fibra}" stroke-width="0.7"/>${fibras}</g>`;
      })
      .join('');
    return `<g transform="translate(${cx} ${TOPO_MAPA}) scale(${sinal} 1)"><path d="${CONTORNO_QUADRIL}" fill="${COR.corpo}"/><path d="${CONTORNO_PERNA}" fill="${COR.corpo}" stroke="${COR.contorno}" stroke-width="0.8"/>${detalhes}${joelho}${desenhados}</g>`;
  });
  const marcadores = [-1, 1].flatMap((sinal) =>
    LOCAIS_MAPA.map((local) => {
      const lado = ladoDoDesenho(sinal, frente);
      if (estadoDoLocal(grupos, avaliados, local, lado) === 'neutro') return '';
      const x = cx + sinal * MARCADOR[local.id].x;
      const y = TOPO_MAPA + MARCADOR[local.id].y;
      return `<g data-local="${local.numero[lado]}"><circle cx="${x}" cy="${y}" r="8" fill="${COR.marcador}"/><text x="${x}" y="${y + 3.5}" font-size="10" font-weight="700" text-anchor="middle" fill="${COR.numero}">${local.numero[lado]}</text></g>`;
    }),
  );
  const rotulo = `<text x="${cx}" y="276" font-size="9" text-anchor="middle" fill="${COR.texto}">${frente ? 'Frente' : 'Costas'}</text>`;
  return pernas.join('') + marcadores.join('') + rotulo;
}

/** Mapa muscular das pernas no laudo: mesmo desenho, estados e legenda da tela, em cores do papel. */
export function montarSvgMapaMuscular(grupos: GruposConsolidados, protocolo: Protocol): string {
  const legenda = [
    [COR.melhorar.fundo, 'melhorar'],
    [COR.ok.fundo, 'ok'],
    [COR.neutro.fundo, 'não avaliado'],
  ]
    .map(([cor, texto]) => `<span style="color:${cor}">&#9679;</span> ${texto}`)
    .join(' · ');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA_MAPA} ${ALTURA_MAPA}" width="60%" role="img" aria-label="Mapa muscular das pernas, de frente e de costas">` +
    vista(CENTRO_FRENTE, true, grupos, protocolo) +
    vista(CENTRO_COSTAS, false, grupos, protocolo) +
    `</svg><p class="legenda">${legenda}</p>`
  );
}

const NOME_CURTO: Record<Protocol, string> = {
  cmj_bi: 'CMJ',
  cmj_uni: 'CMJ Uni',
  sj: 'SJ',
  dj: 'DJ',
  dj_uni: 'DJ Uni',
  agach: 'Agach.',
};

/** Tabela Local / Teste / Medida / Razão / Desvio do laudo, com o motivo abaixo de cada "!". */
export function montarHtmlTabelaLocais(
  pontos: PontoMelhoria[],
  avaliacao: AvaliacaoParaMelhorias & { dataHora: string },
): string {
  const linhas = linhasDaTabela(pontos, avaliacao).map((linha) => {
    const lado = linha.lado === 'ambas' ? '(ambas)' : ROTULO_PERNA[linha.lado].toLowerCase();
    const numeros = linha.lados.map((l) => linha.local.numero[l]).join(', ');
    const grupos = linha.grupos
      .map((g) => ROTULO_GRUPO[g].replace(' (panturrilha)', ''))
      .join(', ');
    const razao = razaoDoLado(avaliacao, linha.lados[0]);
    const melhorar = linha.estado === 'melhorar';
    const desvio = `<span style="color:${COR[linha.estado].fundo};font-weight:bold">${melhorar ? '!' : '&#10003;'}</span>`;
    const motivo = linha.motivos.length
      ? `<tr><td colspan="5" class="numero" style="color:${COR.alerta}">${escaparHtml(linha.motivos.join(' · '))}</td></tr>`
      : '';
    // Um tbody por local: a linha do local e a do motivo não se separam entre páginas.
    return (
      `<tbody><tr><td>${numeros} · ${linha.local.nome} ${lado}<br><span class="secundario">${escaparHtml(grupos)}</span></td>` +
      `<td>${NOME_CURTO[avaliacao.protocolo]}</td><td>${medidaDoLado(avaliacao, linha.lados[0])}</td>` +
      `<td>${razao === null ? '—' : `${formatarDecimal(razao, CASAS_LSI)}%`}</td><td>${desvio}</td></tr>${motivo}</tbody>`
    );
  });
  return (
    `<table class="bloco"><thead><tr><th>Local</th><th>Teste ${dataHoraParaBr(avaliacao.dataHora)}</th><th>Medida</th><th>Razão</th><th>Desvio</th></tr></thead>${linhas.join('')}</table>` +
    `<p class="secundario nota">${escaparHtml(explicacaoDaRazao(avaliacao))}</p>`
  );
}
