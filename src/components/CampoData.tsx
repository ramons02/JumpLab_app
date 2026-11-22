import { Text, View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { calcularIdade, hojeIso, mascararData, paraIso } from '@/utils/datas';

interface CampoDataProps {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  /** Mostra a idade em anos completos ao lado da data, quando ela é válida e não futura. */
  mostrarIdade?: boolean;
}

export function CampoData({ rotulo, valor, aoMudar, erro, mostrarIdade = false }: CampoDataProps) {
  const iso = paraIso(valor);
  const hoje = hojeIso();
  const idade = mostrarIdade && iso && iso <= hoje ? calcularIdade(iso, hoje) : null;

  return (
    <CampoTexto
      rotulo={rotulo}
      valor={valor}
      aoMudar={(digitado) => aoMudar(mascararData(digitado))}
      erro={erro}
      placeholder="dd/mm/aaaa"
      keyboardType="number-pad"
      maxLength={10}
      complemento={
        idade !== null ? (
          <View className="rounded-full bg-destaqueFundo px-2 py-0.5">
            <Text className="text-xs font-semibold text-destaque">{idade} anos</Text>
          </View>
        ) : null
      }
    />
  );
}
