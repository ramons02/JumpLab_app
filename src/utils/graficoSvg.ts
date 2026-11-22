import cores from '@/theme/cores';
import type { GraficoEvolucao, LinhaEvolucao, PontoEvolucao } from '@/utils/evolucao';
import { temPontosSuficientes } from '@/utils/evolucao';
import { formatarDecimal } from '@/utils/formatacao';
import { escaparHtml } from '@/utils/html';

/** Área do gráfico no laudo, em unidades do viewBox (a largura acompanha a página A4). */
export const LARGURA_SVG = 500;
export const ALTURA_SVG = 200;
const MARGEM = { esquerda: 44, direita: 12, topo: 12, base: 28 };
const RAIO_PONTO = 3.5;
const FOLGA_ESCALA = 0.1;
const TAMANHO_FONTE = 9;
const TRACO_REFERENCIA = '4 3';

interface Escala {
  x(indice: number): number;
  y(valor: number): number;
  minimo: number;
  maximo: number;
}

/** Escala comum: o eixo X divide as avaliações igualmente; o Y cobre os valores e a referência. */
export function montarEscala(quantidade: number, valores: number[]): Escala {
  const bruto = { min: Math.min(...valores), max: Math.max(...valores) };
  const folga = (bruto.max - bruto.min || Math.abs(bruto.max) || 1) * FOLGA_ESCALA;
  const minimo = bruto.min - folga;
  const maximo = bruto.max + folga;
  const larguraUtil = LARGURA_SVG - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA_SVG - MARGEM.topo - MARGEM.base;
  return {
    minimo,
    maximo,
    x: (i) =>
      MARGEM.esquerda + (quantidade <= 1 ? larguraUtil / 2 : (i * larguraUtil) / (quantidade - 1)),
    y: (v) => MARGEM.topo + alturaUtil - ((v - minimo) / (maximo - minimo)) * alturaUtil,
  };
}

function numero(valor: number): string {
  return valor.toFixed(1);
}

function rotuloData(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

function texto(x: number, y: number, conteudo: string, ancora = 'middle'): string {
  return `<text x="${numero(x)}" y="${numero(y)}" font-size="${TAMANHO_FONTE}" fill="${cores.papel.textoSecundario}" text-anchor="${ancora}">${escaparHtml(conteudo)}</text>`;
}

function desenharLinha(linha: LinhaEvolucao, escala: Escala): string {
  const cor = cores.grafico[linha.cor];
  const presentes = linha.pontos
    .map((p, i) => (p ? { p, i } : null))
    .filter((x): x is { p: PontoEvolucao; i: number } => x !== null);
  const trajeto = presentes.map(
    ({ p, i }) => `${numero(escala.x(i))},${numero(escala.y(p.valor))}`,
  );
  const polilinha =
    presentes.length >= 2
      ? `<polyline points="${trajeto.join(' ')}" fill="none" stroke="${cor}" stroke-width="2"/>`
      : '';
  const circulos = presentes.map(({ p, i }) => {
    const miolo = p.baixaPrecisao ? cores.papel.fundo : cor;
    return `<circle cx="${numero(escala.x(i))}" cy="${numero(escala.y(p.valor))}" r="${RAIO_PONTO}" fill="${miolo}" stroke="${cor}" stroke-width="1.5"/>`;
  });
  return polilinha + circulos.join('');
}

function desenharReferencia(grafico: GraficoEvolucao, escala: Escala): string {
  if (grafico.referencia === null) return '';
  const y = escala.y(grafico.referencia);
  const fim = LARGURA_SVG - MARGEM.direita;
  return (
    `<line x1="${MARGEM.esquerda}" x2="${fim}" y1="${numero(y)}" y2="${numero(y)}" stroke="${cores.grafico.referencia}" stroke-dasharray="${TRACO_REFERENCIA}"/>` +
    texto(fim, y - 3, `${grafico.referencia}${grafico.unidade}`, 'end')
  );
}

function desenharEixos(grafico: GraficoEvolucao, escala: Escala): string {
  const base = ALTURA_SVG - MARGEM.base;
  const datas = grafico.eixo.map((data, i) => texto(escala.x(i), base + 14, rotuloData(data)));
  const valores = [escala.maximo, escala.minimo].map((v) =>
    texto(MARGEM.esquerda - 4, escala.y(v) + 3, formatarDecimal(v, grafico.casas), 'end'),
  );
  return (
    `<line x1="${MARGEM.esquerda}" x2="${LARGURA_SVG - MARGEM.direita}" y1="${base}" y2="${base}" stroke="${cores.papel.borda}"/>` +
    datas.join('') +
    valores.join('')
  );
}

function desenharLegenda(grafico: GraficoEvolucao): string {
  const itens = grafico.linhas.map(
    (l) => `<span style="color:${cores.grafico[l.cor]}">&#9679;</span> ${escaparHtml(l.nome)}`,
  );
  const temBaixaPrecisao = grafico.linhas.some((l) => l.pontos.some((p) => p?.baixaPrecisao));
  if (temBaixaPrecisao) itens.push('&#9675; baixa precisão');
  itens.push(escaparHtml(grafico.unidade));
  return `<p class="legenda">${itens.join(' · ')}</p>`;
}

/**
 * Gráfico de evolução em SVG dentro do HTML do laudo (o PDF não usa o componente nativo da tela).
 * Sem pontos suficientes, devolve texto vazio: o laudo omite o gráfico (HU010 RN10).
 */
export function montarSvgGrafico(grafico: GraficoEvolucao): string {
  if (!temPontosSuficientes(grafico)) return '';
  const valores = grafico.linhas.flatMap((l) => l.pontos.flatMap((p) => (p ? [p.valor] : [])));
  if (grafico.referencia !== null) valores.push(grafico.referencia);
  const escala = montarEscala(grafico.eixo.length, valores);
  const corpo =
    desenharEixos(grafico, escala) +
    desenharReferencia(grafico, escala) +
    grafico.linhas.map((l) => desenharLinha(l, escala)).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA_SVG} ${ALTURA_SVG}" width="100%">${corpo}</svg>` +
    desenharLegenda(grafico)
  );
}
