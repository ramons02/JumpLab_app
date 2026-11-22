import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import LayoutAbas from '@/app/(tabs)/_layout';
import { CamadaTrocaSenha } from '@/components/TrocarSenhaObrigatoria';
import TelaPacientes from '@/app/(tabs)/index';
import TelaConfiguracoes from '@/app/(tabs)/settings';
import TelaEditarPaciente from '@/app/patient/[id]/edit';
import TelaNovoPaciente from '@/app/patient/new';
import { aplicarMigracoes } from '@/database/migracoes';
import { ProvedorSessao } from '@/hooks/useSessao';
import { ProvedorSincronizacao } from '@/hooks/useSincronizacao';

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
      // Como no app: sessão, sincronização e troca obrigatória de senha envolvem a navegação (012, 013, 016).
      _layout: () => (
        <ProvedorSessao>
          <ProvedorSincronizacao>
            <CamadaTrocaSenha>
              <Stack />
            </CamadaTrocaSenha>
          </ProvedorSincronizacao>
        </ProvedorSessao>
      ),
      '(tabs)/_layout': LayoutAbas,
      '(tabs)/index': TelaPacientes,
      '(tabs)/settings': TelaConfiguracoes,
      // O perfil do paciente é da spec 003; aqui só confirma a navegação.
      'patient/[id]/index': () => null,
      'patient/new': TelaNovoPaciente,
      'patient/[id]/edit': TelaEditarPaciente,
    },
    { initialUrl: [...historico, caminhoInicial].pop() },
  );
}
