import { Pressable, Text } from 'react-native';

export function BotaoNovoPaciente({ aoTocar }: { aoTocar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={aoTocar}
      className="items-center rounded-2xl bg-destaque px-5 py-4"
    >
      <Text className="text-sm font-semibold text-fundo">+ Novo Paciente</Text>
    </Pressable>
  );
}
