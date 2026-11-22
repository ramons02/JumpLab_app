import { ScrollView } from 'react-native';

import { SecaoAvaliador } from '@/components/SecaoAvaliador';
import { useAvaliador } from '@/hooks/useAvaliador';

/** Configurações do aparelho. As specs 012, 013 e 016 acrescentam as seções de conta e sincronização. */
export default function TelaConfiguracoes() {
  const { avaliador, carregado, atualizar } = useAvaliador();
  return (
    <ScrollView className="flex-1 bg-fundo" contentContainerClassName="gap-4 p-4">
      {carregado ? (
        <SecaoAvaliador avaliador={avaliador} aoGravar={(campos) => void atualizar(campos)} />
      ) : null}
    </ScrollView>
  );
}
