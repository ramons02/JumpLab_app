import type { MarcasSalto, PernaTentativa } from '@/types/attempt';
import type {
  AlturaDosPes,
  PontoImagem,
  PontosDoQuadro,
  ResultadoSugestao,
} from '@/types/sugestao';

/*
 * Sugestão automática dos quadros do salto (spec 018, RN04). Funções puras: recebem os pontos dos pés
 * que o módulo nativo achou e devolvem os quadros sugeridos. A regra é a do protótipo
 * (`sugerirQuadrosPelosPes`, tela "Sugestão com vídeo real"), com as mesmas constantes.
 */

/** Mudança de estado (chão ou ar) só conta depois deste número de quadros seguidos. */
export const QUADROS_ESTAVEIS_SUGESTAO = 3;
/** Margem acima da linha do chão, em fração do comprimento da perna na imagem. */
export const TOLERANCIA_CHAO_FRACAO_PERNA = 0.04;
/** A linha do chão é a mediana desta fração de quadros com os pés mais baixos. */
export const FRACAO_MAIS_BAIXA_PARA_CHAO = 0.3;
/** Abaixo desta fração de quadros com pés, não dá para sugerir. */
export const MINIMO_FRACAO_QUADROS_COM_PES = 0.6;
/** Abaixo deste número de quadros com pés, não dá para sugerir. */
export const MINIMO_QUADROS_COM_PES = 10;
/** Escala usada quando os quadris não aparecem. */
export const COMPRIMENTO_PERNA_PADRAO = 0.25;
/** Ponto com visibilidade abaixo disto é ignorado. */
export const VISIBILIDADE_MINIMA = 0.5;
/** Passo da passada grossa a 60 fps; cresce com a taxa: `max(1, round(fps / 60))`. */
export const QUADROS_POR_AMOSTRA_A_60FPS = 1;
/** Quadros lidos de cada lado de uma mudança na passada fina. */
export const JANELA_REFINO_QUADROS = 12;
/** Teto de quadros lidos numa análise. */
export const MAXIMO_QUADROS_ANALISE = 3000;

export const MOTIVO_PES_INSUFICIENTES =
  'Os pés não aparecem em quadros suficientes (pessoa cortada, pouca luz ou câmera mexendo).';
export const MOTIVO_SEM_SALTO = 'Não achei a decolagem e a aterrissagem no vídeo.';
export const MOTIVO_SEM_TOQUE = 'Não achei o toque no solo depois da queda da caixa.';
export const MOTIVO_VIDEO_ILEGIVEL = 'Não consegui ler os quadros deste vídeo.';

/** Pontos mínimos dos pés visíveis num quadro para ele contar (igual ao protótipo). */
const MINIMO_PONTOS_VISIVEIS = 2;

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

function pesDaPerna(pes: NonNullable<PontosDoQuadro['pes']>, perna: PernaTentativa): PontoImagem[] {
  if (perna === 'direita') return pes.direito;
  if (perna === 'esquerda') return pes.esquerdo;
  return [...pes.esquerdo, ...pes.direito];
}

/**
 * Série de alturas dos pés por quadro. No unilateral só conta o pé da perna em teste (lado anatômico).
 * `yPe` é o maior `y` (mais baixo na imagem) entre os pontos visíveis; `perna`, a distância vertical
 * entre a média dos quadris e a média dos tornozelos (primeiro ponto de cada pé).
 */
export function alturasDosPes(pontos: PontosDoQuadro[], perna: PernaTentativa): AlturaDosPes[] {
  return pontos.map(({ quadro, pes, quadris }) => {
    if (!pes) return { quadro, yPe: null, perna: null };
    const visiveis = pesDaPerna(pes, perna).filter((p) => p.visibilidade >= VISIBILIDADE_MINIMA);
    if (visiveis.length < MINIMO_PONTOS_VISIVEIS) return { quadro, yPe: null, perna: null };
    const yPe = Math.max(...visiveis.map((p) => p.y));
    const tornozelos = [pes.esquerdo[0], pes.direito[0]].filter((p) => p !== undefined);
    const comprimento =
      quadris && tornozelos.length > 0
        ? Math.abs(
            tornozelos.reduce((s, p) => s + p.y, 0) / tornozelos.length -
              (quadris.esquerdo.y + quadris.direito.y) / 2,
          )
        : null;
    return { quadro, yPe, perna: comprimento };
  });
}

interface Mudanca {
  quadro: number;
  para: 'chao' | 'ar';
}

interface Analise {
  mudancas: Mudanca[];
}

/** Linha do chão, margem e mudanças de estado; null quando os pés não aparecem o bastante. */
function analisarSerie(serie: AlturaDosPes[]): Analise | null {
  const comPes = serie.filter((q): q is AlturaDosPes & { yPe: number } => q.yPe !== null);
  if (
    comPes.length < MINIMO_QUADROS_COM_PES ||
    comPes.length < serie.length * MINIMO_FRACAO_QUADROS_COM_PES
  ) {
    return null;
  }
  const alturas = comPes.map((q) => q.yPe).sort((a, b) => a - b);
  const chao = mediana(
    alturas.slice(Math.floor(alturas.length * (1 - FRACAO_MAIS_BAIXA_PARA_CHAO))),
  ) as number;
  const pernas = comPes.flatMap((q) => (q.perna === null ? [] : [q.perna]));
  const perna = mediana(pernas) || COMPRIMENTO_PERNA_PADRAO;
  const tolerancia = perna * TOLERANCIA_CHAO_FRACAO_PERNA;

  let estado: boolean | null = null;
  let candidato: boolean | null = null;
  let inicio = 0;
  let seguidos = 0;
  const mudancas: Mudanca[] = [];
  for (const q of comPes) {
    const noChao = q.yPe >= chao - tolerancia;
    if (noChao === estado) {
      candidato = null;
      seguidos = 0;
      continue;
    }
    if (candidato !== noChao) {
      candidato = noChao;
      inicio = q.quadro;
      seguidos = 1;
    } else {
      seguidos++;
    }
    if (seguidos < QUADROS_ESTAVEIS_SUGESTAO) continue;
    if (estado !== null) mudancas.push({ quadro: inicio, para: noChao ? 'chao' : 'ar' });
    estado = noChao;
    candidato = null;
    seguidos = 0;
  }
  return { mudancas };
}

/**
 * Regra da sugestão (RN04). Decolagem: primeira mudança para o ar; aterrissagem: primeira volta ao
 * chão depois dela; Drop Jump: o toque no solo vem antes, como a primeira chegada ao chão. Os eventos
 * saem sempre em ordem.
 */
export function sugerirQuadrosPelosPes(
  serie: AlturaDosPes[],
  dropJump: boolean,
): ResultadoSugestao {
  const ordenada = [...serie].sort((a, b) => a.quadro - b.quadro);
  const analise = analisarSerie(ordenada);
  if (!analise) return { tipo: 'falhou', motivo: MOTIVO_PES_INSUFICIENTES };
  const proxima = (para: Mudanca['para'], depois: number) =>
    analise.mudancas.find((m) => m.para === para && m.quadro > depois);

  const quadros: MarcasSalto = {};
  let desde = -1;
  if (dropJump) {
    const toque = proxima('chao', desde);
    if (!toque) return { tipo: 'falhou', motivo: MOTIVO_SEM_TOQUE };
    quadros.toque = toque.quadro;
    desde = toque.quadro;
  }
  const decolagem = proxima('ar', desde);
  const aterrissagem = decolagem && proxima('chao', decolagem.quadro);
  if (!decolagem || !aterrissagem) return { tipo: 'falhou', motivo: MOTIVO_SEM_SALTO };
  quadros.decolagem = decolagem.quadro;
  quadros.aterrissagem = aterrissagem.quadro;
  return { tipo: 'pronta', quadros };
}

/** Passo da passada grossa: proporcional à taxa e grande o bastante para caber no teto. */
function passoDaAmostra(total: number, fps: number): number {
  const porTaxa = Math.max(1, Math.round((fps / 60) * QUADROS_POR_AMOSTRA_A_60FPS));
  return Math.max(porTaxa, Math.ceil(total / MAXIMO_QUADROS_ANALISE));
}

/** Quadros da primeira passada (research R2): um a cada passo, do 0 ao último. */
export function quadrosDaPassadaGrossa(total: number, fps: number): number[] {
  if (total <= 0) return [];
  const passo = passoDaAmostra(total, fps);
  const quadros: number[] = [];
  for (let q = 0; q < total; q += passo) quadros.push(q);
  return quadros;
}

/**
 * Quadros da segunda passada: `JANELA_REFINO_QUADROS` de cada lado de cada mudança de estado achada na
 * passada grossa, dentro do vídeo, sem repetir quadro nem reler os da passada grossa, e sem passar do
 * teto de quadros lidos.
 */
export function janelasDeRefino(serieGrossa: AlturaDosPes[], total: number): number[] {
  const ordenada = [...serieGrossa].sort((a, b) => a.quadro - b.quadro);
  const analise = analisarSerie(ordenada);
  if (!analise) return [];
  const lidos = new Set(ordenada.map((q) => q.quadro));
  const janela = new Set<number>();
  for (const { quadro } of analise.mudancas) {
    const de = Math.max(0, quadro - JANELA_REFINO_QUADROS);
    const ate = Math.min(total - 1, quadro + JANELA_REFINO_QUADROS);
    for (let q = de; q <= ate; q++) if (!lidos.has(q)) janela.add(q);
  }
  const restante = Math.max(0, MAXIMO_QUADROS_ANALISE - lidos.size);
  return [...janela].sort((a, b) => a - b).slice(0, restante);
}

/** Diferença entre o quadro marcado e o sugerido (positivo: o avaliador avançou). */
export function ajusteDaSugestao(sugerido: number, marcado: number): number {
  return marcado - sugerido;
}

/** "conferido" quando o marcado é o sugerido; senão "ajustado +K quadro(s)" ou "-K" (RN08). */
export function textoDoAjuste(sugerido: number, marcado: number): string {
  const ajuste = ajusteDaSugestao(sugerido, marcado);
  if (ajuste === 0) return 'conferido';
  const sinal = ajuste > 0 ? '+' : '-';
  const quadros = Math.abs(ajuste);
  return `ajustado ${sinal}${quadros} quadro${quadros === 1 ? '' : 's'}`;
}
