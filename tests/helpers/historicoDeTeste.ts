import type { AvaliacaoDoHistorico, ResumoSalto } from '@/types/assessment';
import type { PernaTentativa } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import type { ResumoLsi, ResumoPerna } from '@/types/resultadoSalto';
import type { ResumoAgachamento } from '@/types/squat';

let contador = 0;
/** Todas as avaliações destes construtores são do mesmo paciente. */
export const PACIENTE_DO_HISTORICO = 'paciente-1';

/** Perna do resumo com a altura e o RSI pedidos (os demais campos não importam ao perfil). */
export function perna(
  alturaCm: number,
  rsi: number | null = null,
  baixaPrecisao = false,
): ResumoPerna {
  const medidas = {
    alturaCm,
    tempoVooMs: 500,
    tempoContatoMs: rsi === null ? null : 200,
    rsi,
    margemCm: 0.5,
  };
  return { ...medidas, baixaPrecisao, fps: [240], tentativas: [medidas, medidas, medidas] };
}

export function lsi(valor: number | null, base: 'altura' | 'rsi' = 'altura'): ResumoLsi {
  return { valor, base, modo: 'lesionada', pernaMaisFraca: null };
}

export function avaliacaoSalto(
  protocolo: Protocol,
  dataHora: string,
  pernas: ResumoSalto['pernas'],
  extra: { lsi?: ResumoLsi | null; pernaLesionada?: PernaLesionada; baixaPrecisao?: boolean } = {},
): AvaliacaoDoHistorico {
  contador += 1;
  return {
    id: `00000000-0000-4000-8000-${String(contador).padStart(12, '0')}`,
    pacienteId: PACIENTE_DO_HISTORICO,
    protocolo,
    dataHora,
    pernaLesionada: extra.pernaLesionada ?? 'direita',
    resumo: {
      versao: 1,
      tipo: 'salto',
      pernas,
      lsi: extra.lsi ?? null,
      baixaPrecisao: extra.baixaPrecisao ?? false,
    },
    melhorias: null,
  };
}

export function avaliacaoAgachamento(
  dataHora: string,
  melhorVelocidadeMs: number,
): AvaliacaoDoHistorico {
  contador += 1;
  return {
    id: `00000000-0000-4000-8000-${String(contador).padStart(12, '0')}`,
    pacienteId: PACIENTE_DO_HISTORICO,
    protocolo: 'agach',
    dataHora,
    pernaLesionada: 'nenhuma',
    resumo: {
      versao: 1,
      tipo: 'agach',
      cargaKg: 60,
      fps: 60,
      repeticoes: [],
      melhorVelocidadeMs,
      melhorPotenciaW: 500,
      perdaVelocidadePct: null,
    },
    melhorias: null,
  };
}

/** Grava uma avaliação do histórico direto nas tabelas (sem tentativas), para testes de tela. */
export async function gravarNoHistorico(
  db: import('@/database/conexao').ConexaoBanco,
  pacienteId: string,
  avaliacao: AvaliacaoDoHistorico,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO avaliacao (id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg,
       observacoes, resultado_json, criado_em, atualizado_em, pendente_sync)
     VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, 1)`,
    avaliacao.id,
    pacienteId,
    avaliacao.protocolo,
    avaliacao.dataHora,
    avaliacao.pernaLesionada,
    avaliacao.protocolo === 'agach' ? 60 : null,
    JSON.stringify(avaliacao.resumo),
    '2026-11-22T12:00:00.000Z',
    '2026-11-22T12:00:00.000Z',
  );
}

// Construtores dos testes dos gráficos de evolução (spec 009): resumo direto, sem tentativas.

/** Perna do resumo com a altura pedida e os campos extras dados (ex.: rsi, baixaPrecisao). */
export function pernaResumo(alturaCm: number, extra: Partial<ResumoPerna> = {}): ResumoPerna {
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
  contador += 1;
  return {
    id: `av-${contador}`,
    pacienteId: PACIENTE_DO_HISTORICO,
    protocolo,
    dataHora,
    pernaLesionada: 'direita',
    resumo: { versao: 1, tipo: 'salto', pernas, lsi: null, baixaPrecisao: false, ...extra },
    melhorias: null,
  };
}

export function agachamento(dataHora: string, melhorVelocidadeMs: number): AvaliacaoDoHistorico {
  contador += 1;
  const resumo = {
    versao: 1,
    tipo: 'agach',
    melhorVelocidadeMs,
    melhorPotenciaW: 800,
    perdaVelocidadePct: 10,
  } as unknown as ResumoAgachamento;
  return {
    id: `av-${contador}`,
    pacienteId: PACIENTE_DO_HISTORICO,
    protocolo: 'agach',
    dataHora,
    pernaLesionada: 'nenhuma',
    resumo,
    melhorias: null,
  };
}
