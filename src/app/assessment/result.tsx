import { Redirect, Stack, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, ToastAndroid, View } from 'react-native';

import { BlocoResultado } from '@/components/BlocoResultado';
import { SecaoMelhorias } from '@/components/SecaoMelhorias';
import { conteudoDoTopo, TopoResultado } from '@/components/TopoResultado';
import { useLaudoPdf } from '@/hooks/useLaudoPdf';
import { useParallaxSalto } from '@/hooks/useParallaxSalto';
import { usePerfilPaciente } from '@/hooks/usePerfilPaciente';
import { useRascunhoAvaliacao, type RascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import { avaliacaoDoRascunho, useSalvarAvaliacao } from '@/hooks/useSalvarAvaliacao';
import cores from '@/theme/cores';
import { paraBr } from '@/utils/datas';
import { ESPACO_FINAL_PX, saltoDoDesenhoPx } from '@/utils/poseDesenho';
import { PROTOCOLOS } from '@/utils/protocolos';
import { sugerirMelhorias } from '@/utils/melhorias';
import { montarResumo } from '@/utils/resumoAvaliacao';
import { descartarVideos } from '@/video/descartarVideos';

export const MENSAGEM_SALVA = 'Avaliação salva.';
export const MENSAGEM_SALVA_SEM_PDF = 'Avaliação salva. Não foi possível gerar o PDF.';

/** Resultado da avaliação em andamento, ainda não salva (HU008), com o laudo em PDF (HU010). */
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
  const { gerando, gerarECompartilhar } = useLaudoPdf();
  const ocupado = salvando || gerando;
  const [observacoes, setObservacoes] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [destino, setDestino] = useState<{ rota: string; aviso: string } | null>(null);
  const resumo = useMemo(() => {
    const nova = avaliacaoDoRascunho(rascunho);
    return nova ? montarResumo(nova) : null;
  }, [rascunho]);
  // Sugestões das medidas, revisadas pelo avaliador antes de salvar (HU017).
  const [melhorias, setMelhorias] = useState(() =>
    resumo ? sugerirMelhorias(resumo, rascunho.pernaLesionada) : [],
  );
  const topo = resumo ? conteudoDoTopo(resumo, rascunho.pernaLesionada) : null;
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
    router.dismissTo(destino.rota as `/patient/${string}`);
    ToastAndroid.show(destino.aviso, ToastAndroid.SHORT);
  }, [destino, router]);

  async function soSalvar() {
    const avaliacao = await salvar(observacoes, melhorias);
    if (!avaliacao) return;
    setSalvo(true);
    setDestino({ rota: `/patient/${avaliacao.pacienteId}`, aviso: MENSAGEM_SALVA });
  }

  /** Salva pelo mesmo caminho de Só salvar e já gera o laudo; falha no PDF não desfaz a gravação. */
  async function salvarEExportar() {
    const avaliacao = await salvar(observacoes);
    if (!avaliacao) return;
    setSalvo(true);
    const resultado = await gerarECompartilhar(avaliacao.id);
    const aviso = resultado === 'erro' ? MENSAGEM_SALVA_SEM_PDF : MENSAGEM_SALVA;
    setDestino({ rota: `/patient/${avaliacao.pacienteId}`, aviso });
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
        <BlocoResultado
          protocolo={rascunho.protocolo}
          pernaLesionada={rascunho.pernaLesionada}
          resumo={resumo}
        />
        <SecaoMelhorias
          pontos={melhorias}
          avaliacao={{
            protocolo: rascunho.protocolo,
            pernaLesionada: rascunho.pernaLesionada,
            resumo,
            dataHora: rascunho.dataHora,
          }}
          editavel
          aoMudar={setMelhorias}
        />
        <View className="gap-2">
          <Text className="text-sm font-semibold text-texto">Observações</Text>
          <TextInput
            accessibilityLabel="Observações"
            multiline
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder={
              info.agachamento
                ? 'Profundidade, valgo, controle da descida...'
                : 'Controle de tronco, padrão de aterrissagem...'
            }
            placeholderTextColor={cores.textoSecundario}
            className="min-h-20 rounded-2xl border border-borda bg-cartao p-3 text-sm text-texto"
          />
        </View>
        <Text className="text-xs text-textoSecundario">
          Salva as marcações e os resultados. O vídeo não é guardado.
        </Text>
        <View style={{ height: ESPACO_FINAL_PX }} />
      </ScrollView>
      <View className="flex-row gap-3 border-t border-borda bg-fundo p-4">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: ocupado }}
          disabled={ocupado}
          onPress={soSalvar}
          className={`flex-1 items-center rounded-2xl border border-destaque py-4 ${ocupado ? 'opacity-60' : ''}`}
        >
          <Text className="text-sm font-semibold text-destaque">Só salvar</Text>
        </Pressable>
        {resumo.tipo === 'salto' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: ocupado }}
            disabled={ocupado}
            onPress={salvarEExportar}
            className={`flex-1 items-center rounded-2xl bg-destaque py-4 ${ocupado ? 'opacity-60' : ''}`}
          >
            <Text className="text-sm font-semibold text-fundo">Salvar e exportar PDF</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
