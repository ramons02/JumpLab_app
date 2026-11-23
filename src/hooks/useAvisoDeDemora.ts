import { useEffect, useState } from 'react';

/** Verdadeiro quando `ativo` já dura mais que `esperaMs` (ex.: o servidor da API acordando). */
export function useAvisoDeDemora(ativo: boolean, esperaMs: number): boolean {
  const [demorando, setDemorando] = useState(false);
  useEffect(() => {
    if (!ativo) return;
    const aviso = setTimeout(() => setDemorando(true), esperaMs);
    return () => {
      clearTimeout(aviso);
      setDemorando(false);
    };
  }, [ativo, esperaMs]);
  return demorando;
}
