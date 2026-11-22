import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PlayerQuadros } from '@/components/PlayerQuadros';
import type { VideoSelecionado } from '@/types/attempt';

/**
 * Rota provisória do teste D1 (spec 006, fase 1): escolhe um vídeo de teste, a taxa da faixa do
 * arquivo e monta o PlayerQuadros. Sai do app na fase final da spec 006.
 */
const TAXAS = [240, 30] as const;

export default function TesteD1() {
  const [video, setVideo] = useState<VideoSelecionado | null>(null);
  const [taxa, setTaxa] = useState<number>(240);
  const [quadro, setQuadro] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  async function escolherVideo() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (resultado.canceled) return;
    const arquivo = resultado.assets[0];
    if (!arquivo.duration) {
      setAviso('Não foi possível ler a duração do vídeo.');
      return;
    }
    setAviso(null);
    setQuadro(0);
    setVideo({
      uri: arquivo.uri,
      nome: arquivo.fileName ?? 'video.mp4',
      duracaoS: arquivo.duration / 1000,
      fpsLido: null,
      fpsDoArquivo: taxa,
      temporario: false,
    });
  }

  function trocarTaxa(nova: number) {
    setTaxa(nova);
    setQuadro(0);
    setVideo((atual) => (atual ? { ...atual, fpsDoArquivo: nova } : atual));
  }

  return (
    <ScrollView className="flex-1 bg-fundo" contentContainerClassName="gap-4 p-4">
      <Stack.Screen options={{ title: 'TESTE D1' }} />
      <Pressable
        accessibilityRole="button"
        onPress={escolherVideo}
        className="items-center rounded-2xl border border-destaque py-4"
      >
        <Text className="text-sm font-semibold text-destaque">Escolher vídeo de teste</Text>
      </Pressable>

      <View className="flex-row gap-3">
        {TAXAS.map((opcao) => (
          <Pressable
            key={opcao}
            accessibilityRole="radio"
            accessibilityState={{ checked: taxa === opcao }}
            onPress={() => trocarTaxa(opcao)}
            className={`flex-1 items-center rounded-2xl border py-3 ${
              taxa === opcao ? 'border-destaque bg-destaqueFundo' : 'border-borda bg-cartao'
            }`}
          >
            <Text className="text-sm text-texto">Faixa a {opcao} fps</Text>
          </Pressable>
        ))}
      </View>

      {aviso && <Text className="text-sm text-erro">{aviso}</Text>}

      {video ? (
        <>
          <Text className="text-sm text-textoSecundario">
            {video.nome} · {video.duracaoS.toFixed(3)} s
          </Text>
          <PlayerQuadros
            video={video}
            fpsConfirmado={240}
            quadro={quadro}
            onMudarQuadro={setQuadro}
          />
        </>
      ) : (
        <Text className="text-sm text-textoSecundario">Nenhum vídeo escolhido.</Text>
      )}
    </ScrollView>
  );
}
