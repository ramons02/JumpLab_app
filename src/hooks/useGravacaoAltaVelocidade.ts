import {
  taxasAltaVelocidade,
  type CameraAltaVelocidadeRef,
  type CodigoErroCamera,
} from 'camera-alta-velocidade';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { useAppEmPrimeiroPlano } from '@/hooks/useAppEmPrimeiroPlano';
import { usePermissaoCamera } from '@/hooks/usePermissaoCamera';
import type { VideoSelecionado } from '@/types/attempt';
import { estadoDaGravacao } from '@/utils/estadoGravacao';
import {
  montarVideoGravado,
  taxaInicial,
  taxasAltaSuportadas,
  type TaxaAlta,
} from '@/utils/taxaGravacao';
import { guardarGravacao } from '@/video/gravacoesTemporarias';
import { lerTaxaDoVideo } from '@/video/importarVideo';

export const MENSAGEM_ERRO_GRAVACAO = 'Não foi possível gravar o vídeo. Tente de novo.';
export const MENSAGEM_GRAVACAO_CANCELADA =
  'A gravação foi cancelada porque o app saiu da tela. Grave de novo.';
const UM_SEGUNDO_MS = 1000;

/** Taxas que a câmera libera, lidas uma vez por abertura da tela com a permissão concedida. */
function useTaxasDaCamera(permitida: boolean) {
  const [suportadas, setSuportadas] = useState<TaxaAlta[] | null>(null);
  useEffect(() => {
    if (!permitida) return;
    let ativo = true;
    taxasAltaVelocidade()
      .then(
        (maximos) => ativo && setSuportadas(taxasAltaSuportadas(maximos.map((max) => ({ max })))),
      )
      .catch(() => ativo && setSuportadas([]));
    return () => {
      ativo = false;
    };
  }, [permitida]);
  return [suportadas, setSuportadas] as const;
}

/**
 * Câmera traseira na sessão de alta velocidade, sem áudio (spec 011, D21). Abre na maior taxa que o
 * aparelho libera e só deixa gravar depois que a câmera confirma a taxa: nunca grava em taxa menor.
 */
export function useGravacaoAltaVelocidade() {
  const permissao = usePermissaoCamera();
  const [suportadas, setSuportadas] = useTaxasDaCamera(permissao.status === 'concedida');
  const [escolhida, setEscolhida] = useState<TaxaAlta | null>(null);
  const taxa = escolhida ?? taxaInicial(suportadas ?? []);
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
  const ref = useRef<CameraAltaVelocidadeRef>(null);
  /** A câmera que está gravando; sobrevive à saída da tela, quando o React já soltou a `ref`. */
  const gravandoCom = useRef<CameraAltaVelocidadeRef | null>(null);

  const estado = estadoDaGravacao({
    temPermissao: permissao.status === 'concedida',
    podePedirPermissao: permissao.status !== 'bloqueada',
    erro,
    gravando,
    taxa,
    suportadas,
    negociada,
  });

  const cancelar = useCallback(async () => {
    const camera = gravandoCom.current;
    if (!camera) return;
    gravandoCom.current = null;
    setGravando(false);
    await camera.cancelarGravacao().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (emUso || !gravandoCom.current) return;
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
    const camera = ref.current;
    if (estado !== 'pronta' || !camera) return;
    setAviso(null);
    try {
      await camera.iniciarGravacao();
      gravandoCom.current = camera;
      setSegundos(0);
      setGravando(true);
    } catch {
      setErro(true);
    }
  }, [estado]);

  const parar = useCallback(async (): Promise<VideoSelecionado | null> => {
    const camera = gravandoCom.current;
    if (!camera || taxa === null) return null;
    gravandoCom.current = null;
    setGravando(false);
    try {
      const { caminho, duracaoS } = await camera.pararGravacao();
      const uri = await guardarGravacao(caminho);
      return montarVideoGravado(uri, taxa, duracaoS, await lerTaxaDoVideo(uri));
    } catch {
      setErro(true);
      return null;
    }
  }, [taxa]);

  const aoErroDaCamera = useCallback(
    (codigo: CodigoErroCamera) => {
      if (codigo === 'SEM_ALTA_VELOCIDADE') return setSuportadas([]);
      if (codigo === 'TAXA_NAO_SUPORTADA') {
        return taxa !== null && setNegociada({ pedida: taxa, fps: undefined });
      }
      gravandoCom.current = null;
      setGravando(false);
      setErro(true);
    },
    [taxa, setSuportadas],
  );

  return {
    estado,
    taxa,
    suportadas: suportadas ?? [],
    segundos,
    aviso,
    mensagemErro: estado === 'erro' ? MENSAGEM_ERRO_GRAVACAO : null,
    escolherTaxa: (nova: TaxaAlta) => !gravando && setEscolhida(nova),
    tentarDeNovo: () => setErro(false),
    pedirPermissao: permissao.pedir,
    abrirConfiguracoes: () => Linking.openSettings(),
    gravar,
    parar,
    cancelar,
    propsCamera:
      taxa === null
        ? null
        : {
            ref,
            fps: taxa,
            ativo: emUso,
            onPronta: (e: { nativeEvent: { fps: number } }) =>
              setNegociada({ pedida: taxa, fps: e.nativeEvent.fps }),
            onErro: (e: { nativeEvent: { codigo: CodigoErroCamera } }) =>
              aoErroDaCamera(e.nativeEvent.codigo),
          },
  };
}
