import { Tabs } from 'expo-router/js-tabs';

const COR_FUNDO = '#050706';
const COR_BORDA = '#263130';
const COR_MARCA = '#2ee58a';
const COR_INATIVA = '#93a29b';
const COR_TEXTO = '#eef3f0';

export default function LayoutAbas() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COR_FUNDO },
        headerTintColor: COR_TEXTO,
        tabBarStyle: { backgroundColor: COR_FUNDO, borderTopColor: COR_BORDA },
        tabBarActiveTintColor: COR_MARCA,
        tabBarInactiveTintColor: COR_INATIVA,
        sceneStyle: { backgroundColor: COR_FUNDO },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Pacientes' }} />
    </Tabs>
  );
}
