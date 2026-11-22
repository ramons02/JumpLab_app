import type { InfoProtocolo, Protocol } from '@/types/protocol';

/** Fonte única do nome e das características de cada protocolo, para todas as telas. */
export const PROTOCOLOS: Record<Protocol, InfoProtocolo> = {
  cmj_bi: {
    nome: 'CMJ Bilateral',
    descricao: 'Salto com contramovimento, duas pernas.',
    unilateral: false,
    dropJump: false,
    agachamento: false,
  },
  cmj_uni: {
    nome: 'CMJ Unilateral',
    descricao: 'Direito vs. Esquerdo. LSI pela altura.',
    unilateral: true,
    dropJump: false,
    agachamento: false,
  },
  sj: {
    nome: 'Squat Jump',
    descricao: 'Força concêntrica pura, sem contramovimento.',
    unilateral: false,
    dropJump: false,
    agachamento: false,
  },
  dj: {
    nome: 'Drop Jump',
    descricao: 'Pliometria: tempo de contato e RSI.',
    unilateral: false,
    dropJump: true,
    agachamento: false,
  },
  dj_uni: {
    nome: 'Drop Jump Unilateral',
    descricao: 'Direito vs. Esquerdo. LSI pelo RSI.',
    unilateral: true,
    dropJump: true,
    agachamento: false,
  },
  agach: {
    nome: 'Agachamento com barra',
    descricao: 'Repetições com barra: velocidade da subida e fadiga.',
    unilateral: false,
    dropJump: false,
    agachamento: true,
  },
};

export const ORDEM_PROTOCOLOS: readonly Protocol[] = [
  'cmj_bi',
  'cmj_uni',
  'sj',
  'dj',
  'dj_uni',
  'agach',
];

/** Valida valores lidos do banco ou de parâmetros de rota. */
export function ehProtocolo(valor: unknown): valor is Protocol {
  return typeof valor === 'string' && (ORDEM_PROTOCOLOS as readonly string[]).includes(valor);
}
