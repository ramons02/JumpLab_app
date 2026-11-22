import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { VideoDemonstrativo } from '@/components/VideoDemonstrativo';
import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import { COMO_FAZER } from '@/utils/comoFazer';
import { PROTOCOLOS } from '@/utils/protocolos';

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="gap-2 rounded-2xl border border-borda bg-cartao p-4">
      <Text className="font-titulo text-2xl text-texto">{titulo}</Text>
      {children}
    </View>
  );
}

/** Como fazer: vídeo demonstrativo, passos, o que mede e a dica de filmagem do protocolo escolhido. */
export default function TelaComoFazer() {
  const router = useRouter();
  const { rascunho } = useRascunhoAvaliacao();
  const protocolo = rascunho?.protocolo;

  if (!protocolo) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-fundo p-6">
        <Stack.Screen options={{ title: 'COMO FAZER' }} />
        <Text className="text-center text-base text-texto">
          Escolha o protocolo antes de ver como fazer.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          className="rounded-2xl border border-destaque px-6 py-3"
        >
          <Text className="text-sm font-semibold text-destaque">Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const guia = COMO_FAZER[protocolo];

  return (
    <View className="flex-1 bg-fundo">
      <Stack.Screen options={{ title: 'COMO FAZER' }} />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-28">
        <Text className="font-titulo text-3xl text-texto">{PROTOCOLOS[protocolo].nome}</Text>
        <VideoDemonstrativo fonte={guia.video} />

        <Secao titulo="Execução">
          {guia.passos.map((passo, indice) => (
            <View key={passo} className="flex-row gap-3">
              <Text className="w-5 text-sm font-semibold text-destaque">{indice + 1}.</Text>
              <Text className="flex-1 text-sm text-texto">{passo}</Text>
            </View>
          ))}
          <Text className="mt-2 text-sm font-semibold text-textoSecundario">O que mede</Text>
          <Text className="text-sm text-texto">{guia.objetivo}</Text>
        </Secao>

        <Secao titulo="Filmagem">
          <Text className="text-sm text-texto">{guia.dicaFilmagem}</Text>
        </Secao>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-borda bg-fundo p-4">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/assessment/analyze')}
          className="items-center rounded-2xl bg-destaque py-4"
        >
          <Text className="text-sm font-semibold text-fundo">Entendi, ir para o vídeo</Text>
        </Pressable>
      </View>
    </View>
  );
}
