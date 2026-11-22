import type { NovaAvaliacao, ResumoSalto } from '@/types/assessment';
import type { PernaTentativa } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import { calcularResultadoSalto } from '@/utils/biomechanics';
import { PROTOCOLOS } from '@/utils/protocolos';

/** Resumo gravado em resultado_json: só embrulha o resultado da spec 007, sem regra própria. */
export function montarResumoSalto(nova: NovaAvaliacao): ResumoSalto {
  const info = PROTOCOLOS[nova.protocolo];
  if (info.agachamento) {
    throw new Error('O resumo do agachamento com barra chega com a HU014.');
  }
  return {
    versao: 1,
    tipo: 'salto',
    ...calcularResultadoSalto(nova.tentativas, {
      ehDropJump: info.dropJump,
      pernaLesionada: nova.pernaLesionada,
    }),
  };
}

export interface AlturaDoTopo {
  alturaCm: number;
  perna: PernaTentativa;
  motivo: 'unica' | 'lesionada' | 'mais_fraca';
}

/**
 * Altura mostrada no topo ilustrado (D16), escolhida sem calcular: a perna única nos bilaterais; nos
 * unilaterais, a perna lesionada gravada; sem perna lesionada, a mais fraca do LSI e, sem ela, a direita.
 */
export function alturaDoTopo(resumo: ResumoSalto, pernaLesionada: PernaLesionada): AlturaDoTopo {
  const { pernas } = resumo;
  if (pernas.unica) return { alturaCm: pernas.unica.alturaCm, perna: 'unica', motivo: 'unica' };
  if (pernaLesionada !== 'nenhuma' && pernas[pernaLesionada]) {
    return {
      alturaCm: pernas[pernaLesionada].alturaCm,
      perna: pernaLesionada,
      motivo: 'lesionada',
    };
  }
  const perna = resumo.lsi?.pernaMaisFraca ?? 'direita';
  return { alturaCm: pernas[perna]?.alturaCm ?? 0, perna, motivo: 'mais_fraca' };
}
