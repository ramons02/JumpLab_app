import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { TentativasPorPerna } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import type { SerieEmAndamento } from '@/types/squat';
import { serieVazia } from '@/utils/marcacaoAgachamento';
import { PROTOCOLOS } from '@/utils/protocolos';
import { criarTentativasVazias } from '@/utils/tentativas';

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
  /** Vídeo, FPS e marcas de cada tentativa (spec 005); criadas vazias ao iniciar o rascunho. */
  tentativas: TentativasPorPerna;
  /** Calibração e repetições do agachamento (spec 014); null nos saltos. */
  serie: SerieEmAndamento | null;
}

/** Dados da configuração; as tentativas nascem vazias conforme o protocolo. */
export type DadosRascunho = Omit<RascunhoAvaliacao, 'tentativas' | 'serie'>;

interface ContextoRascunho {
  rascunho: RascunhoAvaliacao | null;
  iniciarRascunho: (dados: DadosRascunho) => void;
  atualizarTentativas: (alterar: (atual: TentativasPorPerna) => TentativasPorPerna) => void;
  atualizarSerie: (alterar: (atual: SerieEmAndamento) => SerieEmAndamento) => void;
  descartarRascunho: () => void;
}

const Contexto = createContext<ContextoRascunho | null>(null);

export function RascunhoAvaliacaoProvider({ children }: { children: ReactNode }) {
  const [rascunho, setRascunho] = useState<RascunhoAvaliacao | null>(null);
  const valor = useMemo(
    () => ({
      rascunho,
      iniciarRascunho: (dados: DadosRascunho) =>
        setRascunho({
          ...dados,
          tentativas: criarTentativasVazias(dados.protocolo),
          serie: PROTOCOLOS[dados.protocolo].agachamento ? serieVazia(null) : null,
        }),
      atualizarTentativas: (alterar: (atual: TentativasPorPerna) => TentativasPorPerna) =>
        setRascunho((atual) =>
          atual ? { ...atual, tentativas: alterar(atual.tentativas) } : atual,
        ),
      atualizarSerie: (alterar: (atual: SerieEmAndamento) => SerieEmAndamento) =>
        setRascunho((atual) => (atual?.serie ? { ...atual, serie: alterar(atual.serie) } : atual)),
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
