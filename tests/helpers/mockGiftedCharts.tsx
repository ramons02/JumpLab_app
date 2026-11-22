import { useEffect } from 'react';
import { View } from 'react-native';

/**
 * react-native-gifted-charts simulado (registrado no jest.config.js): o LineChart vira uma View e as
 * props recebidas ficam em `graficosDesenhados`, para os testes conferirem o que iria para a tela.
 */
export const graficosDesenhados: Record<string, unknown>[] = [];

export function limparGraficos() {
  graficosDesenhados.length = 0;
}

export function LineChart(props: Record<string, unknown>) {
  useEffect(() => {
    graficosDesenhados.push(props);
  });
  return <View testID="grafico-linhas" />;
}
