import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import TelaPacientes from '@/app/(tabs)/index';
import TelaEditarPaciente from '@/app/patient/[id]/edit';
import TelaNovoPaciente from '@/app/patient/new';
import { aplicarMigracoes } from '@/database/migracoes';

import { criarBancoEmMemoria, type BancoDeTeste } from './bancoEmMemoria';

let bancoAtual: BancoDeTeste | null = null;

/** Usado pelo mock de expo-sqlite em cada arquivo de teste de tela. */
export function bancoDaTela(): BancoDeTeste {
  if (!bancoAtual) throw new Error('Banco de teste não preparado.');
  return bancoAtual;
}

export async function prepararBanco(): Promise<BancoDeTeste> {
  bancoAtual = criarBancoEmMemoria();
  await aplicarMigracoes(bancoAtual);
  return bancoAtual;
}

export function fecharBanco() {
  bancoAtual?.fechar();
  bancoAtual = null;
}

/** Abre o app no caminho pedido, com as mesmas rotas do app e uma pilha simples. */
export function abrirApp(caminhoInicial: string, historico: string[] = []) {
  return renderRouter(
    {
      _layout: () => <Stack />,
      index: TelaPacientes,
      'patient/new': TelaNovoPaciente,
      'patient/[id]/edit': TelaEditarPaciente,
    },
    { initialUrl: [...historico, caminhoInicial].pop() },
  );
}
