import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';

/** Avaliação em andamento, em memória, até ser gravada (spec 008) ou descartada. */
export interface RascunhoAvaliacao {
  pacienteId: string;
  protocolo: Protocol;
  /** Só no agachamento; null nos saltos. */
  cargaKg: number | null;
  /** AAAA-MM-DDTHH:MM local, registrada ao seguir da configuração. */
  dataHora: string;
  /** Cópia da perna lesionada do paciente naquele momento. */
  pernaLesionada: PernaLesionada;
}

interface ContextoRascunho {
  rascunho: RascunhoAvaliacao | null;
  iniciarRascunho: (dados: RascunhoAvaliacao) => void;
  descartarRascunho: () => void;
}

const Contexto = createContext<ContextoRascunho | null>(null);

export function RascunhoAvaliacaoProvider({ children }: { children: ReactNode }) {
  const [rascunho, setRascunho] = useState<RascunhoAvaliacao | null>(null);
  const valor = useMemo(
    () => ({
      rascunho,
      iniciarRascunho: (dados: RascunhoAvaliacao) => setRascunho(dados),
      descartarRascunho: () => setRascunho(null),
    }),
    [rascunho],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useRascunhoAvaliacao(): ContextoRascunho {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error('useRascunhoAvaliacao precisa estar dentro de RascunhoAvaliacaoProvider.');
  }
  return contexto;
}
