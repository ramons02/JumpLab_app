import '../../global.css';

import { Stack } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { aplicarMigracoes } from '@/database/migracoes';

const NOME_BANCO = 'jumplab.db';
const COR_FUNDO = '#050706';
const COR_TEXTO = '#eef3f0';

async function prepararBanco(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await aplicarMigracoes(db);
}

export default function LayoutRaiz() {
  return (
    <SQLiteProvider databaseName={NOME_BANCO} onInit={prepararBanco}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COR_FUNDO },
          headerTintColor: COR_TEXTO,
          contentStyle: { backgroundColor: COR_FUNDO },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="patient/new" options={{ title: 'Novo paciente' }} />
        <Stack.Screen name="patient/[id]/edit" options={{ title: 'Editar paciente' }} />
      </Stack>
    </SQLiteProvider>
  );
}
