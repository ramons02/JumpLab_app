import { Pressable, Text, View } from 'react-native';

import type { TaxaAlta } from '@/utils/taxaGravacao';

interface AvisoTaxaNaoSuportadaProps {
  alternativa: TaxaAlta;
  aoUsarAlternativa: () => void;
}

/** O app nunca grava em taxa menor sem avisar (FR-004, CA02). */
export function AvisoTaxaNaoSuportada({
  alternativa,
  aoUsarAlternativa,
}: AvisoTaxaNaoSuportadaProps) {
  return (
    <View accessibilityRole="alert" className="gap-2 rounded-xl bg-aviso-fundo p-3">
      <Text className="text-xs text-aviso">
        Este aparelho grava no máximo a {alternativa} fps. O app não grava em taxa menor sem avisar.
      </Text>
      <Pressable accessibilityRole="button" onPress={aoUsarAlternativa} className="self-start">
        <Text className="text-xs font-bold text-aviso underline">Usar {alternativa} fps</Text>
      </Pressable>
    </View>
  );
}
