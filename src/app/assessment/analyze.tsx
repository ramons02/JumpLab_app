import { Redirect, usePreventRemove } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { AvisoFps } from '@/components/AvisoFps';
import { EscolherVideo } from '@/components/EscolherVideo';
import { PlayerQuadros } from '@/components/PlayerQuadros';
import { SeletorFps } from '@/components/SeletorFps';
import { VideoDaTentativa } from '@/components/VideoDaTentativa';
import { usePerfilPaciente } from '@/hooks/usePerfilPaciente';
import { useRascunhoAvaliacao, type RascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import { useTentativaAtual } from '@/hooks/useTentativaAtual';
import type { PernaTentativa, VideoSelecionado } from '@/types/attempt';
import { avisoDoFps } from '@/utils/fps';
import { PROTOCOLOS } from '@/utils/protocolos';
import { marcacoesLiberadas, pernasDoProtocolo } from '@/utils/tentativas';
import { descartarVideos } from '@/video/descartarVideos';

/** Primeira tentativa da primeira perna; a troca entre tentativas chega com a spec 007. */
const NUMERO_TENTATIVA = 1;

export default function TelaAnalisador() {
  const { rascunho } = useRascunhoAvaliacao();
  if (!rascunho) return <Redirect href="/" />;
  const [perna] = pernasDoProtocolo(rascunho.protocolo);
  if (!perna) return <AnalisadorDoAgachamento />;
  return <Analisador rascunho={rascunho} perna={perna} />;
}

function AnalisadorDoAgachamento() {
  return (
    <View className="flex-1 items-center justify-center bg-fundo p-6">
      <Text className="text-center text-sm text-textoSecundario">
        A análise do agachamento com barra chega com a HU014.
      </Text>
    </View>
  );
}

interface AnalisadorProps {
  rascunho: RascunhoAvaliacao;
  perna: PernaTentativa;
}

function Analisador({ rascunho, perna }: AnalisadorProps) {
  const { descartarRascunho } = useRascunhoAvaliacao();
  const { paciente } = usePerfilPaciente(rascunho.pacienteId);
  const atual = useTentativaAtual(perna, NUMERO_TENTATIVA);
  const { tentativa } = atual;
  const info = PROTOCOLOS[rascunho.protocolo];
  const temVideo = Object.values(rascunho.tentativas).some((lista) => lista?.some((t) => t.video));
  const [quadro, setQuadro] = useQuadroDoVideo(tentativa.video);
  const avisoConfirmado =
    tentativa.fpsConfirmado === null ? null : avisoDoFps(tentativa.fpsConfirmado, true);

  usePreventRemove(temVideo, ({ repeat }) => {
    Alert.alert('Sair da avaliação?', 'As marcações feitas serão perdidas.', [
      { text: 'Continuar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await descartarVideos(rascunho.tentativas);
          repeat();
          descartarRascunho();
        },
      },
    ]);
  });

  return (
    <ScrollView className="flex-1 bg-fundo" contentContainerClassName="gap-4 p-4 pb-8">
      <Text className="text-xs text-textoSecundario">
        {info.nome}
        {paciente ? ` · ${paciente.nome}` : ''}
      </Text>
      {tentativa.video === null ? (
        <EscolherVideo
          perna={perna}
          numero={NUMERO_TENTATIVA}
          mensagem={atual.mensagem}
          aoEscolher={atual.escolherVideo}
        />
      ) : (
        <VideoDaTentativa
          video={tentativa.video}
          fpsConfirmado={tentativa.fpsConfirmado}
          aoTrocarFps={atual.trocarFps}
          aoTrocarVideo={atual.escolherVideo}
        />
      )}
      {tentativa.video ? (
        <PlayerQuadros
          key={tentativa.video.uri}
          video={tentativa.video}
          fpsConfirmado={tentativa.fpsConfirmado}
          quadro={quadro}
          onMudarQuadro={setQuadro}
        />
      ) : null}
      {atual.mensagem && tentativa.video ? (
        <Text className="text-xs text-erro">{atual.mensagem}</Text>
      ) : null}
      {tentativa.video && tentativa.fpsConfirmado === null ? (
        <SeletorFps
          fpsLido={tentativa.video.fpsLido}
          selecionado={tentativa.fpsSelecionado}
          ehSalto
          aoSelecionar={atual.selecionarFps}
          aoConfirmar={atual.confirmarFps}
        />
      ) : null}
      {avisoConfirmado ? <AvisoFps aviso={avisoConfirmado} /> : null}
      {!marcacoesLiberadas(tentativa) ? (
        <Text className="text-center text-xs text-textoSecundario">
          Confirme o FPS para liberar as marcações.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        className="items-center rounded-2xl bg-destaqueFundo py-4"
      >
        <Text className="font-semibold text-textoSecundario">Ver resultado</Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * Quadro mostrado no analisador: estado da tela (spec 006), por vídeo. Volta ao 0 quando o vídeo da
 * tentativa muda; o PlayerQuadros é recriado pela chave do vídeo, liberando o tocador anterior.
 */
function useQuadroDoVideo(video: VideoSelecionado | null) {
  const [estado, setEstado] = useState({ uri: video?.uri ?? null, quadro: 0 });
  const uri = video?.uri ?? null;
  if (estado.uri !== uri) setEstado({ uri, quadro: 0 });
  const quadro = estado.uri === uri ? estado.quadro : 0;
  const setQuadro = useCallback((novo: number) => setEstado({ uri, quadro: novo }), [uri]);
  return [quadro, setQuadro] as const;
}
