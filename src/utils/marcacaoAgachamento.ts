import type {
  EventoRepeticao,
  MarcaBarra,
  MarcasRepeticao,
  SerieEmAndamento,
  SquatSeries,
} from '@/types/squat';

export const MENSAGEM_ORDEM =
  'Marcação recusada: a ordem é início da descida, fundo e fim da subida.';
export const MENSAGEM_ANTES_DA_ANTERIOR =
  'Marcação recusada: a repetição precisa começar depois do fim da anterior.';
export const MENSAGEM_DEPOIS_DA_SEGUINTE =
  'Marcação recusada: o fim da subida precisa vir antes do início da repetição seguinte.';
export const MENSAGEM_CALIBRACAO = 'Topo e base do disco no mesmo ponto. Refaça a calibração.';

const ORDEM: EventoRepeticao[] = ['inicio', 'fundo', 'fim'];

export function repeticaoVazia(): MarcasRepeticao {
  return { inicio: null, fundo: null, fim: null };
}

/** Série nova para o vídeo da tentativa: sem calibração e com uma repetição vazia. */
export function serieVazia(uriDoVideo: string | null): SerieEmAndamento {
  return { uriDoVideo, calibracao: null, repeticoes: [repeticaoVazia()] };
}

export function repeticaoCompleta(r: MarcasRepeticao): boolean {
  return r.inicio !== null && r.fundo !== null && r.fim !== null;
}

/** `+ Repetição` só com a última repetição completa. */
export function podeAdicionarRepeticao(repeticoes: readonly MarcasRepeticao[]): boolean {
  const ultima = repeticoes[repeticoes.length - 1];
  return ultima !== undefined && repeticaoCompleta(ultima);
}

export function validarCalibracao(topoY: number, baseY: number): string | null {
  return topoY === baseY ? MENSAGEM_CALIBRACAO : null;
}

function quadros(r: MarcasRepeticao | undefined): number[] {
  if (!r) return [];
  return ORDEM.flatMap((evento) => (r[evento] ? [r[evento].quadro] : []));
}

/** Confere a ordem dentro da repetição e entre repetições vizinhas; devolve a recusa ou null. */
export function validarMarca(
  repeticoes: readonly MarcasRepeticao[],
  indice: number,
  evento: EventoRepeticao,
  marca: MarcaBarra,
): string | null {
  const atual = repeticoes[indice];
  const posicao = ORDEM.indexOf(evento);
  for (const [i, outro] of ORDEM.entries()) {
    const marcado = atual?.[outro];
    if (i === posicao || !marcado) continue;
    if (i < posicao ? marcado.quadro >= marca.quadro : marcado.quadro <= marca.quadro) {
      return MENSAGEM_ORDEM;
    }
  }
  const anterior = quadros(repeticoes[indice - 1]);
  if (anterior.length > 0 && marca.quadro <= Math.max(...anterior)) {
    return MENSAGEM_ANTES_DA_ANTERIOR;
  }
  const seguinte = quadros(repeticoes[indice + 1]);
  if (seguinte.length > 0 && marca.quadro >= Math.min(...seguinte)) {
    return MENSAGEM_DEPOIS_DA_SEGUINTE;
  }
  return null;
}

/** Lista nova com a marca gravada; a recebida não muda. */
export function aplicarMarca(
  repeticoes: readonly MarcasRepeticao[],
  indice: number,
  evento: EventoRepeticao,
  marca: MarcaBarra,
): MarcasRepeticao[] {
  return repeticoes.map((r, i) => (i === indice ? { ...r, [evento]: { ...marca } } : r));
}

/** Série pronta para medir e gravar; null enquanto faltar FPS, calibração ou repetição completa. */
export function paraSerie(
  fpsConfirmado: number | null,
  serie: SerieEmAndamento,
): SquatSeries | null {
  const { calibracao } = serie;
  if (fpsConfirmado === null || !calibracao || calibracao.baseY === null) return null;
  const completas = serie.repeticoes.filter(repeticaoCompleta);
  if (completas.length === 0) return null;
  return {
    fps: fpsConfirmado,
    calibracao: { topoY: calibracao.topoY, baseY: calibracao.baseY },
    repeticoes: completas,
  };
}
