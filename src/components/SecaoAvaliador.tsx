import { useState } from 'react';
import { Text, View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import type { Avaliador } from '@/types/avaliador';

interface SecaoAvaliadorProps {
  avaliador: Avaliador;
  aoGravar: (campos: Partial<Avaliador>) => void;
}

/**
 * Nome e registro do avaliador, gravados ao sair de cada campo (research R8). Sem logotipo (RN08).
 * Começa com o avaliador já carregado do banco.
 */
export function SecaoAvaliador({ avaliador, aoGravar }: SecaoAvaliadorProps) {
  const [nome, setNome] = useState(avaliador.nome);
  const [registro, setRegistro] = useState(avaliador.registro);

  return (
    <View className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
      <Text className="text-sm font-semibold text-texto">Avaliador (cabeçalho do laudo)</Text>
      <CampoTexto
        rotulo="Nome do avaliador"
        valor={nome}
        aoMudar={setNome}
        onBlur={() => aoGravar({ nome })}
        placeholder="Ex.: Dra. Marina Costa"
      />
      <CampoTexto
        rotulo="Registro profissional (CREFITO, CREF...)"
        valor={registro}
        aoMudar={setRegistro}
        onBlur={() => aoGravar({ registro })}
        placeholder="Ex.: CREFITO-12 000000-F"
      />
      <Text className="text-xs text-textoSecundario">
        Aparece no cabeçalho de todos os laudos, ao lado do símbolo do JumpLab.
      </Text>
    </View>
  );
}
