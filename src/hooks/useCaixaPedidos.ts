import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { ResultadoHttp } from '@/sync/clienteHttp';
import * as administracao from '@/sync/administracao';
import type { PedidoRecuperacao, SenhaTemporariaGerada } from '@/types/conta';

export const MENSAGEM_CAIXA_SEM_CONEXAO = 'Sem conexão.';
const MENSAGEM_SESSAO = 'Sua sessão expirou. Entre de novo.';

function mensagemDeErro<T>(resultado: Exclude<ResultadoHttp<T>, { tipo: 'ok' }>): string {
  if (resultado.tipo === 'erro') return resultado.mensagem;
  return resultado.tipo === 'sem-conexao' ? MENSAGEM_CAIXA_SEM_CONEXAO : MENSAGEM_SESSAO;
}

/**
 * Pedidos de recuperação para o administrador (spec 016, R8). Só carrega com `ativo` (conta
 * administradora), ao ganhar foco. A senha gerada não fica aqui: vai direto para o diálogo.
 */
export function useCaixaPedidos(ativo: boolean) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<PedidoRecuperacao[]>([]);
  const gerando = useRef(false);

  const recarregar = useCallback(async () => {
    if (!ativo) return;
    setCarregando(true);
    const resultado = await administracao.listarPedidos();
    setCarregando(false);
    if (resultado.tipo === 'ok') {
      setPedidos(resultado.dados);
      setErro(null);
    } else {
      setErro(mensagemDeErro(resultado));
    }
  }, [ativo]);

  useFocusEffect(
    useCallback(() => {
      void recarregar();
    }, [recarregar]),
  );

  const gerar = useCallback(async (pedidoId: number): Promise<SenhaTemporariaGerada | null> => {
    if (gerando.current) return null;
    gerando.current = true;
    try {
      const resultado = await administracao.gerarSenhaTemporaria(pedidoId);
      if (resultado.tipo !== 'ok') {
        setErro(mensagemDeErro(resultado));
        return null;
      }
      setErro(null);
      setPedidos((atuais) =>
        atuais.map((p) => (p.id === pedidoId ? { ...p, status: 'atendido' } : p)),
      );
      return resultado.dados;
    } finally {
      gerando.current = false;
    }
  }, []);

  const abertos = pedidos.filter((p) => p.status === 'aberto').length;
  return { carregando, erro, pedidos, abertos, gerar, recarregar };
}
