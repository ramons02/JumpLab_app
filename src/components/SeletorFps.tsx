import { Pressable, Text, View } from 'react-native';

import { AvisoFps } from '@/components/AvisoFps';
import { avisoDoFps, opcoesDeFps, podeConfirmarFps } from '@/utils/fps';

interface SeletorFpsProps {
  fpsLido: number | null;
  selecionado: number | null;
  ehSalto: boolean;
  aoSelecionar: (fps: number) => void;
  aoConfirmar: () => void;
}

export function SeletorFps({
  fpsLido,
  selecionado,
  ehSalto,
  aoSelecionar,
  aoConfirmar,
}: SeletorFpsProps) {
  const aviso = avisoDoFps(selecionado, ehSalto);
  const confirmavel = podeConfirmarFps(selecionado);
  const leitura =
    fpsLido === null
      ? 'Não foi possível ler o FPS de gravação. Escolha antes de marcar.'
      : `Lido nos dados do vídeo: ${fpsLido} fps. Confirme ou corrija.`;

  return (
    <View className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
      <Text className="text-sm font-semibold text-texto">FPS de gravação</Text>
      <Text className="text-xs text-textoSecundario">{leitura}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="FPS de gravação"
        className="flex-row gap-2"
      >
        {opcoesDeFps(fpsLido).map((fps) => {
          const ativo = fps === selecionado;
          return (
            <Pressable
              key={fps}
              accessibilityRole="radio"
              accessibilityLabel={`${fps} fps`}
              accessibilityState={{ checked: ativo }}
              onPress={() => aoSelecionar(fps)}
              className={`flex-1 items-center rounded-xl border py-3 ${ativo ? 'border-destaque bg-destaqueFundo' : 'border-borda bg-fundo'}`}
            >
              <Text className={`font-semibold ${ativo ? 'text-destaque' : 'text-textoSecundario'}`}>
                {fps}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {aviso ? <AvisoFps aviso={aviso} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !confirmavel }}
        disabled={!confirmavel}
        onPress={aoConfirmar}
        className={`items-center rounded-2xl py-3 ${confirmavel ? 'bg-destaque' : 'bg-destaqueFundo'}`}
      >
        <Text className={`font-semibold ${confirmavel ? 'text-fundo' : 'text-textoSecundario'}`}>
          Confirmar FPS
        </Text>
      </Pressable>
    </View>
  );
}
