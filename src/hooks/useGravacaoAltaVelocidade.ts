import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
  useVideoOutput,
  type CameraSessionConfig,
  type Recorder,
} from 'react-native-vision-camera';

import { useAppEmPrimeiroPlano } from '@/hooks/useAppEmPrimeiroPlano';
import type { VideoSelecionado } from '@/types/attempt';
import { estadoDaGravacao } from '@/utils/estadoGravacao';
import {
  montarVideoGravado,
  taxaInicial,
  taxasAltaSuportadas,
  type TaxaAlta,
} from '@/utils/taxaGravacao';
import { apagarArquivoDeGravacao, guardarGravacao } from '@/video/gravacoesTemporarias';
import { lerTaxaDoVideo } from '@/video/importarVideo';

export const MENSAGEM_ERRO_GRAVACAO = 'Não foi possível gravar o vídeo. Tente de novo.';
export const MENSAGEM_GRAVACAO_CANCELADA =
  'A gravação foi cancelada porque o app saiu da tela. Grave de novo.';
const UM_SEGUNDO_MS = 1000;

interface GravacaoEmAndamento {
  gravador: Recorder;
  terminou: Promise<string>;
}

/**
 * Câmera traseira travada em 120 ou 240 fps, sem áudio (research R1 a R6). A taxa só é aceita depois
 * que a câmera confirma, na configuração da sessão, que gravará nela: nunca grava em taxa menor.
 */
export function useGravacaoAltaVelocidade() {
  const permissao = useCameraPermission();
  const device = useCameraDevice('back');
  const suportadas = useMemo(() => taxasAltaSuportadas(device?.supportedFPSRanges ?? []), [device]);
  const [escolhida, setEscolhida] = useState<TaxaAlta | null>(null);
  const taxa = escolhida ?? taxaInicial(suportadas);
  const [negociada, setNegociada] = useState<{ pedida: TaxaAlta; fps: number | undefined } | null>(
    null,
  );
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const focada = useIsFocused();
  const emPrimeiroPlano = useAppEmPrimeiroPlano();
  const emUso = focada && emPrimeiroPlano;
  const saidaVideo = useVideoOutput({ enableAudio: false });
  const atual = useRef<GravacaoEmAndamento | null>(null);

  const estado = estadoDaGravacao({
    temPermissao: permissao.hasPermission,
    podePedirPermissao: permissao.canRequestPermission,
    erro,
    gravando,
    taxa,
    suportadas,
    negociada,
  });

  const cancelar = useCallback(async () => {
    const gravacao = atual.current;
    if (!gravacao) return;
    atual.current = null;
    setGravando(false);
    gravacao.terminou.catch(() => undefined);
    await gravacao.gravador.cancelRecording().catch(() => undefined);
    apagarArquivoDeGravacao(gravacao.gravador.filePath);
  }, []);

  useEffect(() => {
    if (emUso || !atual.current) return;
    void cancelar();
    setAviso(MENSAGEM_GRAVACAO_CANCELADA);
  }, [emUso, cancelar]);

  useEffect(() => () => void cancelar(), [cancelar]);

  useEffect(() => {
    if (!gravando) return;
    const relogio = setInterval(() => setSegundos((s) => s + 1), UM_SEGUNDO_MS);
    return () => clearInterval(relogio);
  }, [gravando]);

  const gravar = useCallback(async () => {
    if (estado !== 'pronta') return;
    setAviso(null);
    try {
      const gravador = await saidaVideo.createRecorder({});
      const terminou = new Promise<string>((resolver, rejeitar) =>
        gravador.startRecording(resolver, rejeitar).catch(rejeitar),
      );
      const gravacao = { gravador, terminou };
      atual.current = gravacao;
      terminou.catch(() => {
        if (atual.current !== gravacao) return;
        void cancelar();
        setErro(true);
      });
      setSegundos(0);
      setGravando(true);
    } catch {
      setErro(true);
    }
  }, [estado, saidaVideo, cancelar]);

  const parar = useCallback(async (): Promise<VideoSelecionado | null> => {
    const gravacao = atual.current;
    if (!gravacao || taxa === null) return null;
    atual.current = null;
    const duracaoS = gravacao.gravador.recordedDuration;
    setGravando(false);
    try {
      await gravacao.gravador.stopRecording();
      const uri = await guardarGravacao(await gravacao.terminou);
      return montarVideoGravado(uri, taxa, duracaoS, await lerTaxaDoVideo(uri));
    } catch {
      apagarArquivoDeGravacao(gravacao.gravador.filePath);
      setErro(true);
      return null;
    }
  }, [taxa]);

  const aoConfigurar = useCallback(
    (config: CameraSessionConfig) =>
      taxa !== null && setNegociada({ pedida: taxa, fps: config.selectedFPS }),
    [taxa],
  );
  const restricoes = useMemo(() => (taxa === null ? [] : [{ fps: taxa }]), [taxa]);

  return {
    estado,
    taxa,
    suportadas,
    segundos,
    aviso,
    mensagemErro: estado === 'erro' ? MENSAGEM_ERRO_GRAVACAO : null,
    escolherTaxa: (nova: TaxaAlta) => !gravando && setEscolhida(nova),
    tentarDeNovo: () => setErro(false),
    pedirPermissao: permissao.requestPermission,
    abrirConfiguracoes: () => Linking.openSettings(),
    gravar,
    parar,
    cancelar,
    propsCamera: device
      ? {
          device,
          isActive: emUso && permissao.hasPermission,
          outputs: [saidaVideo],
          constraints: restricoes,
          onSessionConfigSelected: aoConfigurar,
        }
      : null,
  };
}
