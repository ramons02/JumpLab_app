/**
 * Cálculos biomecânicos a partir dos quadros marcados no vídeo. Única fonte das fórmulas do app
 * (princípio III): funções puras, sem arredondar; o arredondamento é só da exibição.
 * Fórmulas do escopo com as decisões D3 (margem por ±1 quadro), D4 e D12 (LSI).
 */
import type { Attempt, PernaTentativa } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import type {
  CorLsi,
  MedidasSalto,
  MedidaTentativa,
  ResultadoSalto,
  ResumoLsi,
  ResumoPerna,
} from '@/types/resultadoSalto';
import type {
  CalibracaoDisco,
  CorPerda,
  MarcaBarra,
  MarcasRepeticao,
  ResultadoAgachamento,
  ResultadoRepeticao,
  SquatSeries,
} from '@/types/squat';
import { CASAS_LSI } from '@/utils/formatacao';
import { ehBaixaPrecisao } from '@/utils/fps';

export const GRAVIDADE = 9.81;
export const CM_POR_M = 100;
export const MS_POR_S = 1000;
/** LSI a partir de 90% é verde; de 80% a 89,9% amarelo; abaixo, vermelho (D12). */
export const LSI_LIMITE_VERDE = 90;
export const LSI_LIMITE_AMARELO = 80;
const PORCENTO = 100;

function exigirFpsValido(fps: number): void {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError('O FPS precisa ser um número maior que zero.');
  }
}

/** Tempo em segundos entre dois quadros: (final - inicial) / fps. */
export function tempoS(quadroInicial: number, quadroFinal: number, fps: number): number {
  exigirFpsValido(fps);
  if (quadroFinal < quadroInicial) {
    throw new RangeError('O quadro final não pode ser anterior ao inicial.');
  }
  return (quadroFinal - quadroInicial) / fps;
}

/** Altura do salto pelo tempo de voo: g x t² / 8. */
export function alturaCm(tempoVooS: number): number {
  return ((GRAVIDADE * tempoVooS ** 2) / 8) * CM_POR_M;
}

/** Margem da altura para um erro de ±1 quadro: g x t x (1 / fps) / 4 (D3). */
export function margemAlturaCm(tempoVooS: number, fps: number): number {
  exigirFpsValido(fps);
  return ((GRAVIDADE * tempoVooS * (1 / fps)) / 4) * CM_POR_M;
}

/** Índice de força reativa: altura (m) / tempo de contato (s); sem contato, null. */
export function calcularRsi(alturaCmValor: number, tempoContatoS: number): number | null {
  if (tempoContatoS <= 0) return null;
  return alturaCmValor / CM_POR_M / tempoContatoS;
}

/** Índice de simetria entre membros: perna / referência x 100; referência sem medida, null. */
export function calcularLsi(perna: number, referencia: number): number | null {
  if (referencia <= 0) return null;
  return (perna / referencia) * PORCENTO;
}

/** Cor da faixa do LSI decidida pelo valor exibido (com CASAS_LSI casas). */
export function corLsi(valorPct: number | null): CorLsi {
  if (valorPct === null) return 'neutro';
  const fator = 10 ** CASAS_LSI;
  const exibido = Math.round(valorPct * fator) / fator;
  if (exibido >= LSI_LIMITE_VERDE) return 'verde';
  if (exibido >= LSI_LIMITE_AMARELO) return 'amarelo';
  return 'vermelho';
}

/** Medidas de uma tentativa; no Drop Jump também o contato e o RSI. */
export function medirTentativa(tentativa: Attempt, ehDropJump: boolean): MedidaTentativa {
  const { fps, quadroToque, quadroDecolagem, quadroAterrissagem } = tentativa;
  const vooS = tempoS(quadroDecolagem, quadroAterrissagem, fps);
  const altura = alturaCm(vooS);
  let contatoS: number | null = null;
  if (ehDropJump) {
    if (quadroToque === null) {
      throw new RangeError('O Drop Jump precisa do quadro do toque no solo.');
    }
    contatoS = tempoS(quadroToque, quadroDecolagem, fps);
  }
  return {
    alturaCm: altura,
    tempoVooMs: vooS * MS_POR_S,
    tempoContatoMs: contatoS === null ? null : contatoS * MS_POR_S,
    rsi: contatoS === null ? null : calcularRsi(altura, contatoS),
    margemCm: margemAlturaCm(vooS, fps),
    fps,
    baixaPrecisao: ehBaixaPrecisao(fps),
  };
}

function media(valores: number[]): number {
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

/** Média de um campo que pode faltar: null se faltar em alguma tentativa. */
function mediaOpcional(valores: (number | null)[]): number | null {
  return valores.some((valor) => valor === null) ? null : media(valores as number[]);
}

/** Resultado de uma perna: a média de cada medida das tentativas (D11). */
export function mediaDasTentativas(medidas: MedidaTentativa[]): ResumoPerna {
  if (medidas.length === 0) {
    throw new RangeError('É preciso ao menos uma tentativa para tirar a média.');
  }
  return {
    alturaCm: media(medidas.map((m) => m.alturaCm)),
    tempoVooMs: media(medidas.map((m) => m.tempoVooMs)),
    tempoContatoMs: mediaOpcional(medidas.map((m) => m.tempoContatoMs)),
    rsi: mediaOpcional(medidas.map((m) => m.rsi)),
    margemCm: media(medidas.map((m) => m.margemCm)),
    baixaPrecisao: medidas.some((m) => m.baixaPrecisao),
    fps: [...new Set(medidas.map((m) => m.fps))],
    tentativas: medidas.map(
      ({ alturaCm: altura, tempoVooMs, tempoContatoMs, rsi, margemCm }): MedidasSalto => ({
        alturaCm: altura,
        tempoVooMs,
        tempoContatoMs,
        rsi,
        margemCm,
      }),
    ),
  };
}

/**
 * LSI do unilateral: altura no CMJ e RSI no Drop Jump (D4). Com perna lesionada, lesionada / sadia;
 * sem ela, a mais fraca / a mais forte, com a direita como mais fraca no empate (D12).
 */
function resumirLsi(
  direita: ResumoPerna,
  esquerda: ResumoPerna,
  ehDropJump: boolean,
  pernaLesionada: PernaLesionada,
): ResumoLsi {
  const base = ehDropJump ? 'rsi' : 'altura';
  const medida = (perna: ResumoPerna) => (ehDropJump ? (perna.rsi ?? 0) : perna.alturaCm);
  const valorDireita = medida(direita);
  const valorEsquerda = medida(esquerda);

  if (pernaLesionada !== 'nenhuma') {
    const [lesionada, sadia] =
      pernaLesionada === 'direita' ? [valorDireita, valorEsquerda] : [valorEsquerda, valorDireita];
    return { valor: calcularLsi(lesionada, sadia), base, modo: 'lesionada', pernaMaisFraca: null };
  }

  const direitaMaisFraca = valorDireita <= valorEsquerda;
  const [fraca, forte] = direitaMaisFraca
    ? [valorDireita, valorEsquerda]
    : [valorEsquerda, valorDireita];
  return {
    valor: calcularLsi(fraca, forte),
    base,
    modo: 'mais_fraca',
    pernaMaisFraca: direitaMaisFraca ? 'direita' : 'esquerda',
  };
}

/** Medidas por perna, médias das tentativas e, nos unilaterais, o LSI. */
export function calcularResultadoSalto(
  tentativas: Attempt[],
  opcoes: { ehDropJump: boolean; pernaLesionada: PernaLesionada },
): ResultadoSalto {
  const porPerna = new Map<PernaTentativa, Attempt[]>();
  for (const tentativa of tentativas) {
    porPerna.set(tentativa.perna, [...(porPerna.get(tentativa.perna) ?? []), tentativa]);
  }

  const pernas: ResultadoSalto['pernas'] = {};
  for (const [perna, lista] of porPerna) {
    const emOrdem = [...lista].sort((a, b) => a.numero - b.numero);
    pernas[perna] = mediaDasTentativas(emOrdem.map((t) => medirTentativa(t, opcoes.ehDropJump)));
  }

  const lsi =
    pernas.direita && pernas.esquerda
      ? resumirLsi(pernas.direita, pernas.esquerda, opcoes.ehDropJump, opcoes.pernaLesionada)
      : null;

  return {
    pernas,
    lsi,
    baixaPrecisao: Object.values(pernas).some((perna) => perna.baixaPrecisao),
  };
}

/* Agachamento com barra (HU014): velocidade da subida pela calibração do disco. */

/** Diâmetro do disco olímpico, usado para calibrar pixels por centímetro. */
export const DIAMETRO_DISCO_CM = 45;
/** Perda de velocidade até 20% é verde; até 40% amarela; acima, vermelha. */
export const PERDA_LIMITE_VERDE = 20;
export const PERDA_LIMITE_AMARELO = 40;

/** Escala da imagem: distância entre topo e base do disco dividida pelo diâmetro real. */
export function pixelsPorCm(calibracao: CalibracaoDisco): number {
  const { topoY, baseY } = calibracao;
  if (!Number.isFinite(topoY) || !Number.isFinite(baseY) || topoY === baseY) {
    throw new Error('Topo e base do disco no mesmo ponto. Refaça a calibração.');
  }
  return Math.abs(baseY - topoY) / DIAMETRO_DISCO_CM;
}

function repeticaoCompletaNaSerie(
  r: MarcasRepeticao,
): r is Record<'inicio' | 'fundo' | 'fim', MarcaBarra> {
  return r.inicio !== null && r.fundo !== null && r.fim !== null;
}

/** Descida, subida, amplitude, velocidade e potência por repetição; melhores e perda na série. */
export function medirAgachamento(serie: SquatSeries, cargaKg: number): ResultadoAgachamento {
  exigirFpsValido(serie.fps);
  if (!Number.isFinite(cargaKg) || cargaKg <= 0) {
    throw new Error('A carga precisa ser maior que zero.');
  }
  const escala = pixelsPorCm(serie.calibracao);
  const completas = serie.repeticoes.filter(repeticaoCompletaNaSerie);
  if (completas.length === 0) {
    throw new Error('Marque ao menos uma repetição completa.');
  }

  const repeticoes = completas.map(({ inicio, fundo, fim }, indice): ResultadoRepeticao => {
    if (!(inicio.quadro < fundo.quadro && fundo.quadro < fim.quadro)) {
      throw new Error('A ordem é início da descida, fundo e fim da subida.');
    }
    const subidaS = tempoS(fundo.quadro, fim.quadro, serie.fps);
    const amplitudeCm = Math.abs(fundo.y - fim.y) / escala;
    const velocidadeMs = amplitudeCm / CM_POR_M / subidaS;
    return {
      numero: indice + 1,
      descidaS: tempoS(inicio.quadro, fundo.quadro, serie.fps),
      subidaS,
      amplitudeCm,
      velocidadeMs,
      potenciaW: cargaKg * GRAVIDADE * velocidadeMs,
    };
  });

  const melhorVelocidadeMs = Math.max(...repeticoes.map((r) => r.velocidadeMs));
  const ultima = repeticoes[repeticoes.length - 1].velocidadeMs;
  return {
    cargaKg,
    fps: serie.fps,
    repeticoes,
    melhorVelocidadeMs,
    melhorPotenciaW: Math.max(...repeticoes.map((r) => r.potenciaW)),
    perdaVelocidadePct:
      repeticoes.length < 2
        ? null
        : ((melhorVelocidadeMs - ultima) / melhorVelocidadeMs) * PORCENTO,
  };
}

/** Semáforo da perda de velocidade (fadiga). */
export function corPerda(perdaPct: number | null): CorPerda {
  if (perdaPct === null) return 'neutro';
  if (perdaPct <= PERDA_LIMITE_VERDE) return 'verde';
  if (perdaPct <= PERDA_LIMITE_AMARELO) return 'amarelo';
  return 'vermelho';
}
