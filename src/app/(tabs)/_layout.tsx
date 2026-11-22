import { Tabs } from 'expo-router/js-tabs';

import cores from '@/theme/cores';
import { FONTE_TITULO } from '@/theme/fontes';

export default function LayoutAbas() {
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontFamily: FONTE_TITULO, fontSize: 30 },
        tabBarActiveTintColor: cores.destaque,
        tabBarInactiveTintColor: cores.textoSecundario,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'PACIENTES', tabBarLabel: 'Pacientes' }} />
    </Tabs>
  );
}
