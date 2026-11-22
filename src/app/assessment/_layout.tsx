import { Stack } from 'expo-router';

import { RascunhoAvaliacaoProvider } from '@/hooks/useRascunhoAvaliacao';
import { FONTE_TITULO } from '@/theme/fontes';

/** Fluxo da avaliação: todas as telas compartilham a avaliação em andamento. */
export default function LayoutAvaliacao() {
  return (
    <RascunhoAvaliacaoProvider>
      <Stack screenOptions={{ headerTitleStyle: { fontFamily: FONTE_TITULO, fontSize: 26 } }}>
        <Stack.Screen name="setup" options={{ title: 'NOVA AVALIAÇÃO' }} />
      </Stack>
    </RascunhoAvaliacaoProvider>
  );
}
