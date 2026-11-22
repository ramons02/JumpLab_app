import { ScrollView } from 'react-native';

import { CaixaPedidosSenha } from '@/components/CaixaPedidosSenha';
import { SecaoAvaliador } from '@/components/SecaoAvaliador';
import { SecaoConta } from '@/components/SecaoConta';
import { SecaoSincronizacao } from '@/components/SecaoSincronizacao';
import { SecaoSugestaoAutomatica } from '@/components/SecaoSugestaoAutomatica';
import { useAvaliador } from '@/hooks/useAvaliador';
import { useSessao } from '@/hooks/useSessao';

/**
 * Configurações do aparelho. As specs 012, 013 e 016 acrescentam as seções de conta e sincronização;
 * a 018, a chave da sugestão automática em teste.
 */
export default function TelaConfiguracoes() {
  const { avaliador, carregado, atualizar } = useAvaliador();
  const { conta } = useSessao();
  return (
    <ScrollView className="flex-1 bg-fundo" contentContainerClassName="gap-4 p-4">
      {carregado ? (
        <SecaoAvaliador avaliador={avaliador} aoGravar={(campos) => void atualizar(campos)} />
      ) : null}
      {conta?.admin && !conta.trocaSenhaObrigatoria ? <CaixaPedidosSenha /> : null}
      <SecaoConta />
      <SecaoSincronizacao />
      <SecaoSugestaoAutomatica />
    </ScrollView>
  );
}
