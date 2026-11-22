import type { NumeroTentativa, PernaTentativa } from '@/types/attempt';

const PERNAS: readonly PernaTentativa[] = ['unica', 'direita', 'esquerda'];
const NUMEROS: readonly NumeroTentativa[] = [1, 2, 3];

/** Perna e tentativa vindas da rota, validadas na entrada da tela; inválidas devolvem null. */
export function lerPernaETentativa(
  perna: string | undefined,
  tentativa: string | undefined,
): { perna: PernaTentativa; numero: NumeroTentativa } | null {
  const pernaValida = PERNAS.find((p) => p === perna);
  const numeroValido = NUMEROS.find((n) => String(n) === tentativa);
  return pernaValida && numeroValido ? { perna: pernaValida, numero: numeroValido } : null;
}
