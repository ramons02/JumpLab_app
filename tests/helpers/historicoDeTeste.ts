import type { AvaliacaoDoHistorico, ResumoSalto } from '@/types/assessment';
import type { PernaTentativa } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import type { ResumoAgachamento } from '@/types/squat';
import type { ResumoPerna } from '@/types/resultadoSalto';

let sequencia = 0;

export function perna(alturaCm: number, extra: Partial<ResumoPerna> = {}): ResumoPerna {
  return {
    alturaCm,
    tempoVooMs: 500,
    tempoContatoMs: null,
    rsi: null,
    margemCm: 0.5,
    baixaPrecisao: false,
    fps: [240],
    tentativas: [],
    ...extra,
  };
}

/** Avaliação de salto no histórico, com o resumo já gravado (spec 008). */
export function salto(
  protocolo: Protocol,
  dataHora: string,
  pernas: Partial<Record<PernaTentativa, ResumoPerna>>,
  extra: Partial<ResumoSalto> = {},
): AvaliacaoDoHistorico {
  sequencia += 1;
  return {
    id: `av-${sequencia}`,
    protocolo,
    dataHora,
    pernaLesionada: 'direita',
    resumo: { versao: 1, tipo: 'salto', pernas, lsi: null, baixaPrecisao: false, ...extra },
  };
}

export function lsi(valor: number | null, base: 'altura' | 'rsi'): ResumoSalto['lsi'] {
  return { valor, base, modo: 'lesionada', pernaMaisFraca: null };
}

export function agachamento(dataHora: string, melhorVelocidadeMs: number): AvaliacaoDoHistorico {
  sequencia += 1;
  const resumo = {
    versao: 1,
    tipo: 'agach',
    melhorVelocidadeMs,
    melhorPotenciaW: 800,
    perdaVelocidadePct: 10,
  } as unknown as ResumoAgachamento;
  return { id: `av-${sequencia}`, protocolo: 'agach', dataHora, pernaLesionada: 'nenhuma', resumo };
}
