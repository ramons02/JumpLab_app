import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import {
  contarPendentes,
  lerEstadoSync,
  listarIdsPacientesPendentes,
} from '@/database/sincronizacao';
import { useSessao } from '@/hooks/useSessao';
import { sincronizar, type MotivoSync } from '@/sync/sincronizador';
import type { EstadoExibido, EstadoSync } from '@/types/sincronizacao';

interface ContextoSincronizacao {
  estado: EstadoExibido;
  ultimaSincronizacao: string | null;
  /** Pacientes com algo ainda não enviado (vazio sem sessão). */
  pacientesPendentes: Set<string>;
  sincronizarAgora(): Promise<void>;
  aoSalvarAvaliacao(): void;
  /** Relê a contagem e os pendentes (ex.: a lista ao ganhar foco depois de um cadastro). */
  atualizarPendentes(): Promise<void>;
}

const NADA = new Set<string>();

/** Fora do provedor (telas testadas sozinhas) a sincronização simplesmente não acontece. */
const SEM_SINCRONIZACAO: ContextoSincronizacao = {
  estado: { tipo: 'sem-sessao' },
  ultimaSincronizacao: null,
  pacientesPendentes: NADA,
  sincronizarAgora: async () => undefined,
  aoSalvarAvaliacao: () => undefined,
  atualizarPendentes: async () => undefined,
};

const Contexto = createContext<ContextoSincronizacao | null>(null);

function estadoExibido(
  temConta: boolean,
  sincronizando: boolean,
  estado: EstadoSync | null,
  pendentes: number,
): EstadoExibido {
  if (!temConta) return { tipo: 'sem-sessao' };
  if (sincronizando) return { tipo: 'sincronizando' };
  if (estado?.ultimoResultado === 'erro') {
    return {
      tipo: 'erro',
      motivo: estado.ultimoErro ?? 'Erro desconhecido.',
      quantidadePendente: pendentes,
    };
  }
  return pendentes > 0 ? { tipo: 'pendente', quantidade: pendentes } : { tipo: 'sincronizado' };
}

/**
 * Sincronização automática (spec 013, research R9): ao abrir o app com sessão, ao entrar ou criar a
 * conta, ao voltar para o app e depois de salvar uma avaliação; e pelo botão `Sincronizar agora`.
 */
export function ProvedorSincronizacao({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { carregando, conta } = useSessao();
  const email = conta?.email ?? null;
  const [estadoSync, setEstadoSync] = useState<EstadoSync | null>(null);
  const [pendentes, setPendentes] = useState(0);
  const [idsPendentes, setIdsPendentes] = useState<Set<string>>(NADA);
  const [sincronizando, setSincronizando] = useState(false);

  const atualizarPendentes = useCallback(async () => {
    const [estado, quantidade, ids] = await Promise.all([
      lerEstadoSync(db),
      contarPendentes(db),
      listarIdsPacientesPendentes(db),
    ]);
    setEstadoSync(estado);
    setPendentes(quantidade);
    setIdsPendentes(ids);
  }, [db]);

  const rodar = useCallback(
    async (motivo: MotivoSync) => {
      if (!email) return;
      setSincronizando(true);
      try {
        await sincronizar(db, email, motivo);
      } finally {
        setSincronizando(false);
        await atualizarPendentes();
      }
    },
    [db, email, atualizarPendentes],
  );

  // Abertura com sessão e troca de conta (entrar ou criar conta).
  const emailAnterior = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (carregando) return;
    const antes = emailAnterior.current;
    emailAnterior.current = email;
    const motivo: MotivoSync | null =
      email === null ? null : antes === undefined ? 'abertura' : antes !== email ? 'login' : null;
    // Depois desta renderização: as duas mudam o estado do provedor.
    void Promise.resolve().then(async () => {
      await atualizarPendentes();
      if (motivo) await rodar(motivo);
    });
  }, [carregando, email, rodar, atualizarPendentes]);

  // Volta para o app com sessão.
  useEffect(() => {
    const inscricao = AppState.addEventListener('change', (situacao) => {
      if (situacao === 'active') void rodar('retorno-ao-app');
    });
    return () => inscricao.remove();
  }, [rodar]);

  const valor = useMemo<ContextoSincronizacao>(
    () => ({
      estado: estadoExibido(email !== null, sincronizando, estadoSync, pendentes),
      ultimaSincronizacao: estadoSync?.ultimaSincronizacao ?? null,
      pacientesPendentes: email ? idsPendentes : NADA,
      sincronizarAgora: () => rodar('manual'),
      aoSalvarAvaliacao: () => {
        void atualizarPendentes();
        void rodar('avaliacao-salva');
      },
      atualizarPendentes,
    }),
    [email, sincronizando, estadoSync, pendentes, idsPendentes, rodar, atualizarPendentes],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSincronizacao(): ContextoSincronizacao {
  return useContext(Contexto) ?? SEM_SINCRONIZACAO;
}
