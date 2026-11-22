import '../../global.css';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { aplicarMigracoes } from '@/database/migracoes';
import cores from '@/theme/cores';
import { FONTE_TITULO } from '@/theme/fontes';

const NOME_BANCO = 'jumplab.db';

const TEMA_ESCURO = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: cores.destaque,
    background: cores.fundo,
    card: cores.fundo,
    text: cores.texto,
    border: cores.borda,
  },
};

async function prepararBanco(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await aplicarMigracoes(db);
}

export default function LayoutRaiz() {
  return (
    <SQLiteProvider databaseName={NOME_BANCO} onInit={prepararBanco}>
      <ThemeProvider value={TEMA_ESCURO}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerTitleStyle: { fontFamily: FONTE_TITULO, fontSize: 26 } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="patient/new" options={{ title: 'NOVO PACIENTE' }} />
          <Stack.Screen name="patient/[id]/edit" options={{ title: 'EDITAR PACIENTE' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
