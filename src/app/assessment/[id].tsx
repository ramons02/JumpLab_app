import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BlocoResultado } from '@/components/BlocoResultado';
import { SecaoMelhorias } from '@/components/SecaoMelhorias';
import { conteudoDoTopo, TopoResultado } from '@/components/TopoResultado';
import { useAvaliacaoSalva } from '@/hooks/useAvaliacaoSalva';
import { useLaudoPdf } from '@/hooks/useLaudoPdf';
import { useParallaxSalto } from '@/hooks/useParallaxSalto';
import { usePerfilPaciente } from '@/hooks/usePerfilPaciente';
import type { Assessment } from '@/types/assessment';
import { paraBr } from '@/utils/datas';
import { sugerirMelhorias } from '@/utils/melhorias';
import { ESPACO_FINAL_PX, saltoDoDesenhoPx } from '@/utils/poseDesenho';
import { PROTOCOLOS } from '@/utils/protocolos';

/** Avaliação salva, só leitura: mostra os números guardados, sem recalcular. */
export default function TelaAvaliacaoSalva() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { carregando, avaliacao } = useAvaliacaoSalva(id);

  if (carregando) return <View className="flex-1 bg-fundo" />;
  if (!avaliacao) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-fundo p-6">
        <Stack.Screen options={{ title: 'AVALIAÇÃO' }} />
        <Text className="text-base text-texto">Avaliação não encontrada.</Text>
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
  return <AvaliacaoSalva avaliacao={avaliacao} />;
}

function AvaliacaoSalva({ avaliacao }: { avaliacao: Assessment }) {
  const { paciente } = usePerfilPaciente(avaliacao.pacienteId);
  const topo = conteudoDoTopo(avaliacao.resumo, avaliacao.pernaLesionada);
  const parallax = useParallaxSalto(saltoDoDesenhoPx(topo.alturaCm));

  return (
    <ScrollView
      className="flex-1 bg-fundo"
      contentContainerClassName="gap-4 p-4"
      onScroll={parallax.aoRolar}
      scrollEventThrottle={16}
      testID="rolagem-avaliacao"
    >
      <Stack.Screen options={{ title: 'RESULTADO' }} />
      <TopoResultado parallax={parallax} topo={topo} />
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-xs text-textoSecundario">
          {PROTOCOLOS[avaliacao.protocolo].nome}
          {paciente ? ` · ${paciente.nome}` : ''} · {paraBr(avaliacao.dataHora.slice(0, 10))}
        </Text>
        <View className="rounded-full bg-cartao px-3 py-1">
          <Text className="text-xs font-semibold text-textoSecundario">Somente leitura</Text>
        </View>
      </View>
      <BlocoResultado
        protocolo={avaliacao.protocolo}
        pernaLesionada={avaliacao.pernaLesionada}
        resumo={avaliacao.resumo}
      />
      <SecaoMelhorias
        pontos={avaliacao.melhorias ?? sugerirMelhorias(avaliacao.resumo, avaliacao.pernaLesionada)}
        avaliacao={avaliacao}
      />
      <View className="gap-2">
        <Text className="text-sm font-semibold text-texto">Observações</Text>
        <Text
          testID="observacoes"
          className="rounded-2xl border border-borda bg-cartao p-3 text-sm text-texto"
        >
          {avaliacao.observacoes || 'Sem observações.'}
        </Text>
      </View>
      <CompartilharPdf avaliacaoId={avaliacao.id} />
      <View style={{ height: ESPACO_FINAL_PX }} />
    </ScrollView>
  );
}

export const MENSAGEM_ERRO_PDF = 'Não foi possível gerar o PDF.';

/** Gera o laudo da avaliação salva e abre a folha de compartilhamento (HU010, US1). */
function CompartilharPdf({ avaliacaoId }: { avaliacaoId: string }) {
  const { gerando, gerarECompartilhar } = useLaudoPdf();
  const [erro, setErro] = useState(false);

  async function compartilhar() {
    const resultado = await gerarECompartilhar(avaliacaoId);
    if (resultado) setErro(resultado === 'erro');
  }

  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: gerando }}
        disabled={gerando}
        onPress={compartilhar}
        className={`items-center rounded-2xl bg-destaque py-4 ${gerando ? 'opacity-60' : ''}`}
      >
        <Text className="text-sm font-semibold text-fundo">Compartilhar PDF</Text>
      </Pressable>
      {erro ? (
        <Text accessibilityRole="alert" className="text-center text-xs text-erro">
          {MENSAGEM_ERRO_PDF}
        </Text>
      ) : null}
    </View>
  );
}
