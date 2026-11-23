import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { abrirCameraDoCelular } from '@/video/cameraDoCelular';

export const MENSAGEM_SEM_ALTA_VELOCIDADE =
  'Este aparelho não libera a câmera lenta (120 ou 240 fps) para outros apps. Abra a câmera do celular, filme no modo Câmera lenta e depois escolha o vídeo da galeria.';
export const MENSAGEM_CAMERA_NAO_ABRIU = 'Não foi possível abrir a câmera do celular.';

interface SemCameraLentaProps {
  /** Escolhe da galeria para a mesma perna e tentativa; verdadeiro quando escolheu. */
  aoEscolherDaGaleria: () => Promise<boolean>;
  /** Volta ao analisador depois de escolher. */
  aoConcluir: () => void;
  mensagemGaleria: string | null;
}

/** Caminho do aparelho sem câmera lenta para outros apps (D21): câmera do celular e depois a galeria. */
export function SemCameraLenta({
  aoEscolherDaGaleria,
  aoConcluir,
  mensagemGaleria,
}: SemCameraLentaProps) {
  const [erro, setErro] = useState<string | null>(null);

  async function abrirCamera() {
    setErro((await abrirCameraDoCelular()) ? null : MENSAGEM_CAMERA_NAO_ABRIU);
  }

  async function escolher() {
    if (await aoEscolherDaGaleria()) aoConcluir();
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-fundo p-6">
      <Text className="text-center text-sm text-texto">{MENSAGEM_SEM_ALTA_VELOCIDADE}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={abrirCamera}
        className="w-full items-center rounded-2xl bg-destaque py-3"
      >
        <Text className="text-sm font-semibold text-fundo">Abrir a câmera do celular</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={escolher}
        className="w-full items-center rounded-2xl border border-destaque py-3"
      >
        <Text className="text-sm font-semibold text-destaque">Escolher vídeo da galeria</Text>
      </Pressable>
      {erro || mensagemGaleria ? (
        <Text accessibilityRole="alert" className="text-center text-xs text-erro">
          {erro ?? mensagemGaleria}
        </Text>
      ) : null}
    </View>
  );
}
