import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import LayoutAvaliacao from '@/app/assessment/_layout';
import TelaAnalisador from '@/app/assessment/analyze';
import TelaCamera from '@/app/assessment/camera';
import TelaConfiguracao from '@/app/assessment/setup';
import { inserirPaciente } from '@/database/pacientes';

import { bancoDaTela } from './telas';

/** Abre a configuração, escolhe o protocolo e segue para o analisador, com a rota da câmera. */
export async function abrirAnalisador(protocolo = 'CMJ Bilateral') {
  const paciente = await inserirPaciente(bancoDaTela(), {
    nome: 'Ana Souza',
    dataNascimento: '1995-03-15',
    perfil: 'pos_lca',
    pernaLesionada: 'direita',
    dataLesao: '2026-05-20',
  });
  const app = await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Tela de pacientes</Text>,
      'assessment/_layout': LayoutAvaliacao,
      'assessment/setup': TelaConfiguracao,
      'assessment/analyze': TelaAnalisador,
      'assessment/camera': TelaCamera,
    },
    { initialUrl: `/assessment/setup?pacienteId=${paciente.id}` },
  );
  await fireEvent.press(await screen.findByRole('radio', { name: protocolo }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Ir para o vídeo' }));
  await screen.findByRole('button', { name: 'Escolher vídeo da galeria' });
  return app;
}

/** Do analisador, toca em `Gravar com a câmera`. */
export async function abrirCamera() {
  await fireEvent.press(screen.getByRole('button', { name: 'Gravar com a câmera' }));
}

export const botaoGravar = () => screen.getByRole('button', { name: 'Gravar' });
export const botaoParar = () => screen.getByRole('button', { name: 'Parar' });
