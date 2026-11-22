import { Pressable, Text, View } from 'react-native';

import { TAXAS_ALTAS, type TaxaAlta } from '@/utils/taxaGravacao';

interface SeletorTaxaProps {
  taxa: TaxaAlta | null;
  bloqueado: boolean;
  aoEscolher: (taxa: TaxaAlta) => void;
}

/** 120 ou 240 fps; travado durante a gravação (FR-009). */
export function SeletorTaxa({ taxa, bloqueado, aoEscolher }: SeletorTaxaProps) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row gap-2">
      {TAXAS_ALTAS.map((opcao) => {
        const ativa = opcao === taxa;
        return (
          <Pressable
            key={opcao}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativa, disabled: bloqueado }}
            disabled={bloqueado}
            onPress={() => aoEscolher(opcao)}
            className={`rounded-full px-3 py-1.5 ${ativa ? 'bg-texto' : 'bg-cartao'} ${bloqueado ? 'opacity-40' : ''}`}
          >
            <Text className={`text-sm font-semibold ${ativa ? 'text-fundo' : 'text-texto'}`}>
              {opcao} fps
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
