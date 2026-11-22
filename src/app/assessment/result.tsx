import { Redirect, Stack, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, ToastAndroid, View } from 'react-native';

import { BlocoSalto } from '@/components/BlocoSalto';
import { TopoResultado } from '@/components/TopoResultado';
import { useParallaxSalto } from '@/hooks/useParallaxSalto';
import { usePerfilPaciente } from '@/hooks/usePerfilPaciente';
import { useRascunhoAvaliacao, type RascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import { avaliacaoDoRascunho, useSalvarAvaliacao } from '@/hooks/useSalvarAvaliacao';
import cores from '@/theme/cores';
import { paraBr } from '@/utils/datas';
import { ESPACO_FINAL_PX, saltoDoDesenhoPx } from '@/utils/poseDesenho';
import { PROTOCOLOS } from '@/utils/protocolos';
import { alturaDoTopo, montarResumoSalto } from '@/utils/resumoAvaliacao';
import { descartarVideos } from '@/video/descartarVideos';

/** Resultado da avaliação em andamento, ainda não salva (HU008). */
export default function TelaResultado() {
  const { rascunho } = useRascunhoAvaliacao();
  // Depois de salvar, o rascunho é apagado antes de a tela sair: a tela segue com o último.
  const [ultimo, setUltimo] = useState(rascunho);
  if (rascunho && rascunho !== ultimo) setUltimo(rascunho);
  const atual = rascunho ?? ultimo;
  if (!atual) return <Redirect href="/" />;
  return <Resultado rascunho={atual} />;
}

function Resultado({ rascunho }: { rascunho: RascunhoAvaliacao }) {
  const router = useRouter();
  const { descartarRascunho } = useRascunhoAvaliacao();
  const { paciente } = usePerfilPaciente(rascunho.pacienteId);
  const { salvando, salvar } = useSalvarAvaliacao();
  const [observacoes, setObservacoes] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [destino, setDestino] = useState<string | null>(null);
  const resumo = useMemo(() => {
    const nova = avaliacaoDoRascunho(rascunho);
    return nova ? montarResumoSalto(nova) : null;
  }, [rascunho]);
  const topo = resumo ? alturaDoTopo(resumo, rascunho.pernaLesionada) : null;
  const parallax = useParallaxSalto(saltoDoDesenhoPx(topo?.alturaCm ?? null));
  const info = PROTOCOLOS[rascunho.protocolo];

  usePreventRemove(!salvo, ({ repeat }) => {
    Alert.alert('Descartar avaliação?', 'O resultado ainda não foi salvo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          await descartarVideos(rascunho.tentativas).catch(() => undefined);
          setSalvo(true);
          repeat();
          descartarRascunho();
        },
      },
    ]);
  });

  // Navega só depois de a proteção contra saída ser desligada (salvo = true).
  useEffect(() => {
    if (!destino) return;
    router.dismissTo(destino as `/patient/${string}`);
    ToastAndroid.show('Avaliação salva.', ToastAndroid.SHORT);
  }, [destino, router]);

  async function soSalvar() {
    const avaliacao = await salvar(observacoes);
    if (!avaliacao) return;
    setSalvo(true);
    setDestino(`/patient/${avaliacao.pacienteId}`);
  }

  if (!resumo || !topo) return null;

  return (
    <View className="flex-1 bg-fundo">
      <Stack.Screen options={{ title: 'RESULTADO' }} />
      <ScrollView
        contentContainerClassName="gap-4 p-4"
        onScroll={parallax.aoRolar}
        scrollEventThrottle={16}
        testID="rolagem-resultado"
      >
        <TopoResultado parallax={parallax} topo={topo} />
        <Text className="text-xs text-textoSecundario">
          {info.nome}
          {paciente ? ` · ${paciente.nome}` : ''} · {paraBr(rascunho.dataHora.slice(0, 10))}
        </Text>
        <BlocoSalto
          protocolo={rascunho.protocolo}
          pernaLesionada={rascunho.pernaLesionada}
          resumo={resumo}
        />
        <View className="gap-2">
          <Text className="text-sm font-semibold text-texto">Observações</Text>
          <TextInput
            accessibilityLabel="Observações"
            multiline
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Controle de tronco, padrão de aterrissagem..."
            placeholderTextColor={cores.textoSecundario}
            className="min-h-20 rounded-2xl border border-borda bg-cartao p-3 text-sm text-texto"
          />
        </View>
        <Text className="text-xs text-textoSecundario">
          Salva as marcações e os resultados. O vídeo não é guardado.
        </Text>
        <View style={{ height: ESPACO_FINAL_PX }} />
      </ScrollView>
      <View className="border-t border-borda bg-fundo p-4">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: salvando }}
          disabled={salvando}
          onPress={soSalvar}
          className={`items-center rounded-2xl bg-destaque py-4 ${salvando ? 'opacity-60' : ''}`}
        >
          <Text className="text-sm font-semibold text-fundo">Só salvar</Text>
        </Pressable>
      </View>
    </View>
  );
}
