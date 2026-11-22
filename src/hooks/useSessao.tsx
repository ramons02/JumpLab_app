import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as autenticacao from '@/sync/autenticacao';
import * as recuperacao from '@/sync/recuperacao';
import { lerSessao } from '@/sync/armazenamentoSessao';
import { aoEncerrarSessao, type ResultadoHttp } from '@/sync/clienteHttp';
import type { Conta, DadosCriarConta, Sessao } from '@/types/conta';

interface ContextoSessao {
  carregando: boolean;
  conta: Conta | null;
  /** A sessão acabou por renovação recusada (mostrar "Sua sessão expirou..."). */
  expirou: boolean;
  entrar(email: string, senha: string): Promise<ResultadoHttp<Sessao>>;
  criarConta(dados: DadosCriarConta): Promise<ResultadoHttp<Sessao>>;
  sair(): Promise<void>;
  /** Pedido de recuperação de senha ao administrador (spec 016). */
  pedirRecuperacao(email: string): Promise<ResultadoHttp<null>>;
  /** Senha nova depois da temporária; a conta volta sem troca pendente. */
  criarSenhaNova(senhaNova: string): Promise<ResultadoHttp<Sessao>>;
}

const Contexto = createContext<ContextoSessao | null>(null);

/** Conta conectada (spec 012). Não bloqueia o app: tudo local funciona sem ela. */
export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [conta, setConta] = useState<Conta | null>(null);
  const [expirou, setExpirou] = useState(false);

  useEffect(() => {
    let ativo = true;
    lerSessao()
      .then((sessao) => {
        if (ativo) setConta(sessao?.conta ?? null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    const parar = aoEncerrarSessao(() => {
      setConta(null);
      setExpirou(true);
    });
    return () => {
      ativo = false;
      parar();
    };
  }, []);

  const aposEntrar = useCallback((resultado: ResultadoHttp<Sessao>) => {
    if (resultado.tipo === 'ok') {
      setConta(resultado.dados.conta);
      setExpirou(false);
    }
    return resultado;
  }, []);

  const entrar = useCallback(
    async (email: string, senha: string) => aposEntrar(await autenticacao.entrar(email, senha)),
    [aposEntrar],
  );

  const criarConta = useCallback(
    async ({ nome, email, senha }: DadosCriarConta) =>
      aposEntrar(await autenticacao.criarConta({ nome, email, senha })),
    [aposEntrar],
  );

  const criarSenhaNova = useCallback(
    async (senhaNova: string) => aposEntrar(await recuperacao.criarSenhaNova(senhaNova)),
    [aposEntrar],
  );

  const sair = useCallback(async () => {
    await autenticacao.sair();
    setConta(null);
    setExpirou(false);
  }, []);

  const valor = useMemo(
    () => ({
      carregando,
      conta,
      expirou,
      entrar,
      criarConta,
      sair,
      pedirRecuperacao: recuperacao.pedirRecuperacao,
      criarSenhaNova,
    }),
    [carregando, conta, expirou, entrar, criarConta, sair, criarSenhaNova],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): ContextoSessao {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSessao precisa estar dentro de ProvedorSessao.');
  return contexto;
}
