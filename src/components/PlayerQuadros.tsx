import { VideoView } from 'expo-video';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BarraDeQuadros, type MarcaDaBarra, type TrechoDeVoo } from '@/components/BarraDeQuadros';
import { FitaDeQuadros } from '@/components/FitaDeQuadros';
import { LinhaGuia } from '@/components/LinhaGuia';
import { useAreaDoVideo } from '@/hooks/useAreaDoVideo';
import { useMiniaturasDeQuadros } from '@/hooks/useMiniaturasDeQuadros';
import { useTocadorQuadros } from '@/hooks/useTocadorQuadros';
import type { VideoSelecionado } from '@/types/attempt';
import { tempoS } from '@/utils/biomechanics';
import type { Dimensoes } from '@/utils/coordenadaVideo';
import { formatarDecimal } from '@/utils/formatacao';
import {
  fpsDeNavegacao,
  PASSO_RAPIDO_QUADROS,
  podeAvancar,
  podeVoltar,
  quadrosVizinhos,
} from '@/utils/quadros';

const CASAS_TEMPO_S = 3;

interface PlayerQuadrosProps {
  video: VideoSelecionado;
  fpsConfirmado: number | null;
  quadro: number;
  onMudarQuadro(quadro: number): void;
  /** Camada sobre a imagem e abaixo da linha guia (toques e marcadores do agachamento, spec 014). */
  camadaSobreImagem?: (area: Dimensoes, video: Dimensoes | null) => ReactNode;
  /** Eventos marcados e sugestão sobre a barra de progresso (D23). */
  marcasDaBarra?: MarcaDaBarra[];
  /** Trecho de voo pintado na barra (D23). */
  voo?: TrechoDeVoo | null;
  /** Selo do evento marcado no quadro atual, sobre o vídeo (D23). */
  selo?: string | null;
}

type EstiloBotao = 'cheio' | 'contorno' | 'discreto';

const CLASSE_BOTAO: Record<EstiloBotao, { caixa: string; texto: string }> = {
  cheio: { caixa: 'flex-1 bg-destaque', texto: 'text-fundo' },
  contorno: { caixa: 'px-4 border border-destaque', texto: 'text-destaque' },
  discreto: { caixa: 'px-3 border border-borda bg-cartao', texto: 'text-texto' },
};

function BotaoQuadro({
  rotulo,
  acessivel = rotulo,
  habilitado,
  onPress,
  estilo = 'cheio',
}: {
  rotulo: string;
  acessivel?: string;
  habilitado: boolean;
  onPress: () => void;
  estilo?: EstiloBotao;
}) {
  const classe = CLASSE_BOTAO[estilo];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={acessivel}
      disabled={!habilitado}
      onPress={onPress}
      className={`items-center justify-center rounded-2xl py-4 ${classe.caixa} ${
        habilitado ? '' : 'opacity-40'
      }`}
    >
      <Text className={`text-base font-semibold ${classe.texto}`}>{rotulo}</Text>
    </Pressable>
  );
}

/**
 * Vídeo quadro a quadro: imagem parada com o quadro e o tempo por cima, fita de quadros vizinhos,
 * barra com as marcas e botões de 10 e de 1 quadro (spec 006 e D23).
 */
export function PlayerQuadros({
  video,
  fpsConfirmado,
  quadro,
  onMudarQuadro,
  camadaSobreImagem,
  marcasDaBarra = [],
  voo = null,
  selo = null,
}: PlayerQuadrosProps) {
  const fps = fpsDeNavegacao(video, fpsConfirmado);
  const tocador = useTocadorQuadros({ video, fps, quadro, onMudarQuadro });
  const [previa, setPrevia] = useState<number | null>(null);
  const imagem = useAreaDoVideo(tocador.player);
  const navegavel = fps !== null;
  const exibido = previa ?? quadro;
  const vizinhos = quadrosVizinhos(quadro, tocador.totalQuadros);
  const miniaturas = useMiniaturasDeQuadros(video.uri, fps, navegavel ? vizinhos : []);
  const ultimo = tocador.totalQuadros - 1;

  return (
    <View className="gap-3">
      <View
        testID="imagem-video"
        className="h-80 w-full overflow-hidden rounded-2xl border border-borda bg-fundo"
        onLayout={imagem.aoMedir}
      >
        <VideoView
          testID="video-quadros"
          player={tocador.player}
          nativeControls={false}
          contentFit="contain"
          style={{ flex: 1 }}
        />
        {camadaSobreImagem && imagem.area ? camadaSobreImagem(imagem.area, imagem.video) : null}
        <LinhaGuia />
        {navegavel ? (
          <View
            pointerEvents="none"
            className="absolute left-2 top-2 flex-row items-baseline gap-2 rounded-lg bg-fundo/80 px-2 py-1"
          >
            <Text className="text-sm font-semibold text-texto">{`Quadro ${exibido} / ${ultimo}`}</Text>
            {fpsConfirmado !== null && fpsConfirmado > 0 ? (
              <Text testID="tempo-quadro" className="text-xs text-textoSecundario">
                {formatarDecimal(tempoS(0, exibido, fpsConfirmado), CASAS_TEMPO_S)} s
              </Text>
            ) : null}
          </View>
        ) : null}
        {selo ? (
          <Text
            testID="selo-evento"
            pointerEvents="none"
            className="absolute right-2 top-2 rounded-full border border-destaque bg-destaqueFundo px-2 py-1 text-xs font-semibold text-destaque"
          >
            {selo}
          </Text>
        ) : null}
      </View>

      {navegavel ? null : (
        <Text className="text-center text-base text-texto">
          Confirme o FPS do vídeo para navegar pelos quadros.
        </Text>
      )}

      {navegavel ? (
        <FitaDeQuadros
          quadros={vizinhos}
          atual={quadro}
          miniaturas={miniaturas}
          desabilitada={tocador.reproduzindo}
          aoEscolher={tocador.irPara}
        />
      ) : null}

      <BarraDeQuadros
        quadro={exibido}
        totalQuadros={tocador.totalQuadros}
        desabilitada={!navegavel}
        marcas={marcasDaBarra}
        voo={voo}
        onArrastar={(alvo) => {
          setPrevia(alvo);
          tocador.posicionar(alvo);
        }}
        onSoltar={(alvo) => {
          setPrevia(null);
          tocador.irPara(alvo);
        }}
      />

      <View className="flex-row gap-2">
        <BotaoQuadro
          rotulo="-10"
          acessivel="-10 quadros"
          habilitado={navegavel && podeVoltar(quadro)}
          onPress={() => tocador.irPara(quadro - PASSO_RAPIDO_QUADROS)}
          estilo="discreto"
        />
        <BotaoQuadro
          rotulo="-1 Frame"
          habilitado={navegavel && podeVoltar(quadro)}
          onPress={tocador.voltar}
        />
        <BotaoQuadro
          rotulo={tocador.reproduzindo ? 'Pausar' : 'Reproduzir'}
          habilitado={
            navegavel && (tocador.reproduzindo || podeAvancar(quadro, tocador.totalQuadros))
          }
          onPress={tocador.alternarReproducao}
          estilo="contorno"
        />
        <BotaoQuadro
          rotulo="+1 Frame"
          habilitado={navegavel && podeAvancar(quadro, tocador.totalQuadros)}
          onPress={tocador.avancar}
        />
        <BotaoQuadro
          rotulo="+10"
          acessivel="+10 quadros"
          habilitado={navegavel && podeAvancar(quadro, tocador.totalQuadros)}
          onPress={() => tocador.irPara(quadro + PASSO_RAPIDO_QUADROS)}
          estilo="discreto"
        />
      </View>
    </View>
  );
}
