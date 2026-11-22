import type { GraficoEvolucao } from '@/utils/evolucao';

export const SECOES_EIXO_Y = 4;
const FOLGA = 0.1;

/**
 * Eixo vertical do gráfico na tela: começa perto do menor valor (yAxisOffset) para a variação não sumir
 * quando os valores estão longe de zero, e cobre a referência de 90% no LSI.
 */
export function escalaDoGrafico(grafico: GraficoEvolucao): {
  deslocamento: number;
  maximo: number;
} {
  const valores = grafico.linhas.flatMap((l) => l.pontos.flatMap((p) => (p ? [p.valor] : [])));
  if (grafico.referencia !== null) valores.push(grafico.referencia);
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  const folga = (maior - menor || Math.abs(maior) || 1) * FOLGA;
  const deslocamento = Math.max(0, Math.floor(menor - folga));
  const maximo = Math.ceil(maior + folga) - deslocamento;
  return { deslocamento, maximo };
}

/** "2026-11-05" vira "05/11". */
export function rotuloDoEixo(dataIso: string): string {
  const [, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}`;
}
