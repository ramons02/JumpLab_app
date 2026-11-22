import type { NovaAvaliacao } from '@/types/assessment';
import type { Attempt, NumeroTentativa, PernaTentativa } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';

/** Três tentativas de uma perna, com o voo (e o contato, no Drop Jump) em quadros. */
export function tresTentativas(
  perna: PernaTentativa,
  quadrosDeVoo: number[],
  fps = 240,
  quadrosDeContato?: number[],
): Attempt[] {
  return ([1, 2, 3] as NumeroTentativa[]).map((numero, i) => {
    const contato = quadrosDeContato?.[i];
    const decolagem = 1000;
    return {
      perna,
      numero,
      fps,
      quadroToque: contato === undefined ? null : decolagem - contato,
      quadroDecolagem: decolagem,
      quadroAterrissagem: decolagem + quadrosDeVoo[i],
    };
  });
}

export function novaAvaliacao(
  pacienteId: string,
  protocolo: Protocol,
  tentativas: Attempt[],
  extra: Partial<NovaAvaliacao> = {},
): NovaAvaliacao {
  return {
    pacienteId,
    protocolo,
    dataHora: '2026-11-22T10:30',
    pernaLesionada: 'direita',
    cargaKg: null,
    tentativas,
    serie: null,
    ...extra,
  };
}

/** CMJ bilateral (CA01 da HU007): 120 quadros de voo a 240 fps. */
export const CMJ_BILATERAL = tresTentativas('unica', [120, 120, 120]);
/** CMJ unilateral (CA06 da HU007): direita (lesionada) mais baixa que a esquerda. */
export const CMJ_UNILATERAL = [
  ...tresTentativas('direita', [110, 110, 110]),
  ...tresTentativas('esquerda', [120, 120, 120]),
];
/** Drop Jump: 96 quadros de voo e 48 de contato a 240 fps. */
export const DROP_JUMP = tresTentativas('unica', [96, 96, 96], 240, [48, 48, 48]);
