import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { SimboloJumpLab } from '@/components/SimboloJumpLab';
import cores from '@/theme/cores';
import { FONTE_TITULO } from '@/theme/fontes';

const TAMANHO_SIMBOLO_CABECALHO = 36;

function SimboloCabecalho() {
  return (
    <View className="mr-4">
      <SimboloJumpLab tamanho={TAMANHO_SIMBOLO_CABECALHO} />
    </View>
  );
}

export default function LayoutAbas() {
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontFamily: FONTE_TITULO, fontSize: 30 },
        tabBarActiveTintColor: cores.destaque,
        tabBarInactiveTintColor: cores.textoSecundario,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'PACIENTES', tabBarLabel: 'Pacientes', headerRight: SimboloCabecalho }}
      />
    </Tabs>
  );
}
