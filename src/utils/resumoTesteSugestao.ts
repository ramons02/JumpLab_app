import type { Protocol } from '@/types/protocol';
import type { ResumoGrupoTeste, ResumoTesteSugestao } from '@/types/sugestao';

/** Um evento conta como acerto se o marcado ficou a até este número de quadros do sugerido (RN13). */
export const LIMITE_QUADROS_TESTE = 2;
/** Meta para liberar a função: percentual de eventos dentro do limite (RN13). */
export const META_TESTE_PCT = 90;

/** Um evento com quadro sugerido e marcado numa avaliação salva. */
export interface ParSugeridoMarcado {
  protocolo: Protocol;
  sugerido: number;
  marcado: number;
}

const GRUPOS: { nome: ResumoGrupoTeste['nome']; protocolos: Protocol[] }[] = [
  { nome: 'CMJ', protocolos: ['cmj_bi', 'cmj_uni'] },
  { nome: 'Squat Jump', protocolos: ['sj'] },
  { nome: 'Drop Jump', protocolos: ['dj', 'dj_uni'] },
];

/** Conta, por grupo de protocolo e no total, os eventos e quantos ficaram dentro do limite. */
export function resumoTesteSugestao(pares: ParSugeridoMarcado[]): ResumoTesteSugestao {
  const dentroDoLimite = (p: ParSugeridoMarcado) =>
    Math.abs(p.marcado - p.sugerido) <= LIMITE_QUADROS_TESTE;
  const grupos = GRUPOS.map(({ nome, protocolos }) => {
    const doGrupo = pares.filter((p) => protocolos.includes(p.protocolo));
    return { nome, total: doGrupo.length, dentro: doGrupo.filter(dentroDoLimite).length };
  });
  const total = grupos.reduce((s, g) => s + g.total, 0);
  const dentro = grupos.reduce((s, g) => s + g.dentro, 0);
  return { grupos, total, dentro, meta: META_TESTE_PCT };
}

/** Percentual inteiro de acertos; 0 sem eventos. */
export function percentualDentro(resumo: { total: number; dentro: number }): number {
  return resumo.total === 0 ? 0 : Math.round((resumo.dentro / resumo.total) * 100);
}
