import type { AvaliacaoDoHistorico } from '@/types/assessment';
import type { Protocol } from '@/types/protocol';
import type { CorLsi, ResumoPerna } from '@/types/resultadoSalto';
import { corLsi } from '@/utils/biomechanics';
import {
  CASAS_ALTURA,
  CASAS_LSI,
  CASAS_RSI,
  CASAS_VELOCIDADE,
  formatarDecimal,
} from '@/utils/formatacao';

/**
 * Valores do perfil (HU003, entrega 2), escolhidos do resumo gravado sem calcular métrica.
 * Todas recebem a lista da mais recente para a mais antiga.
 */

export interface CardLsi {
  /** null = "LSI não calculado" */
  valor: number | null;
  base: 'altura' | 'rsi';
  /** null quando o valor é null */
  cor: CorLsi | null;
  dataHora: string;
}

export interface CardRsi {
  valor: number;
  protocolo: Protocol;
  dataHora: string;
}

export interface MedidaPrincipal {
  texto: string;
  /** Só no LSI calculado */
  cor: CorLsi | null;
}

/** Perna mostrada de um salto: a única; nos unilaterais, a lesionada gravada ou, sem ela, a direita. */
function pernaDoSalto(avaliacao: AvaliacaoDoHistorico): ResumoPerna | null {
  if (avaliacao.resumo.tipo !== 'salto') return null;
  const { pernas } = avaliacao.resumo;
  if (pernas.unica) return pernas.unica;
  const perna = avaliacao.pernaLesionada === 'nenhuma' ? 'direita' : avaliacao.pernaLesionada;
  return pernas[perna] ?? null;
}

export function ultimoLsi(avaliacoes: AvaliacaoDoHistorico[]): CardLsi | null {
  for (const avaliacao of avaliacoes) {
    const { resumo } = avaliacao;
    if (resumo.tipo === 'salto' && resumo.lsi) {
      const { valor, base } = resumo.lsi;
      return {
        valor,
        base,
        cor: valor === null ? null : corLsi(valor),
        dataHora: avaliacao.dataHora,
      };
    }
  }
  return null;
}

export function rsiDaAvaliacao(avaliacao: AvaliacaoDoHistorico): number | null {
  if (avaliacao.protocolo !== 'dj' && avaliacao.protocolo !== 'dj_uni') return null;
  return pernaDoSalto(avaliacao)?.rsi ?? null;
}

export function ultimoRsi(avaliacoes: AvaliacaoDoHistorico[]): CardRsi | null {
  for (const avaliacao of avaliacoes) {
    const valor = rsiDaAvaliacao(avaliacao);
    if (valor !== null)
      return { valor, protocolo: avaliacao.protocolo, dataHora: avaliacao.dataHora };
  }
  return null;
}

/** Altura do salto mais recente (pula o agachamento); null sem salto. */
export function ultimoSalto(avaliacoes: AvaliacaoDoHistorico[]): number | null {
  for (const avaliacao of avaliacoes) {
    const perna = pernaDoSalto(avaliacao);
    if (perna) return perna.alturaCm;
  }
  return null;
}

/** Medida mostrada no item do histórico, conforme o protocolo. */
export function medidaPrincipal(avaliacao: AvaliacaoDoHistorico): MedidaPrincipal {
  const { resumo } = avaliacao;
  if (resumo.tipo === 'agach') {
    return {
      texto: `${formatarDecimal(resumo.melhorVelocidadeMs, CASAS_VELOCIDADE)} m/s`,
      cor: null,
    };
  }
  if (avaliacao.protocolo === 'cmj_uni' || avaliacao.protocolo === 'dj_uni') {
    const valor = resumo.lsi?.valor ?? null;
    if (valor === null) return { texto: 'LSI não calculado', cor: null };
    return { texto: `LSI ${formatarDecimal(valor, CASAS_LSI)}%`, cor: corLsi(valor) };
  }
  if (avaliacao.protocolo === 'dj') {
    const rsi = rsiDaAvaliacao(avaliacao);
    return { texto: rsi === null ? 'RSI -' : `RSI ${formatarDecimal(rsi, CASAS_RSI)}`, cor: null };
  }
  const altura = pernaDoSalto(avaliacao)?.alturaCm;
  return {
    texto: altura === undefined ? '-' : `${formatarDecimal(altura, CASAS_ALTURA)} cm`,
    cor: null,
  };
}
