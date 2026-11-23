import { CameraAltaVelocidade } from 'camera-alta-velocidade';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AvisoTaxaNaoSuportada } from '@/components/AvisoTaxaNaoSuportada';
import { IndicadorGravacao } from '@/components/IndicadorGravacao';
import { LinhaGuia } from '@/components/LinhaGuia';
import { SemCameraLenta } from '@/components/SemCameraLenta';
import { SeletorTaxa } from '@/components/SeletorTaxa';
import { useGravacaoAltaVelocidade } from '@/hooks/useGravacaoAltaVelocidade';
import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import { useTentativaAtual } from '@/hooks/useTentativaAtual';
import type { NumeroTentativa, PernaTentativa } from '@/types/attempt';
import { taxaAlternativa } from '@/utils/estadoGravacao';
import { lerPernaETentativa } from '@/utils/rotaTentativa';

export const MENSAGEM_MOTIVO_CAMERA =
  'O app usa a câmera para filmar o salto em câmera lenta. O vídeo não sai do app e é apagado ao fim da avaliação.';
export const MENSAGEM_CAMERA_NEGADA =
  'Sem a câmera, o app não grava o salto. Permita o acesso nas configurações do aparelho ou escolha um vídeo da galeria.';
export const MENSAGEM_PREPARANDO = 'Preparando a câmera em câmera lenta...';
export const MENSAGEM_TENTATIVA_INVALIDA = 'Tentativa inválida. Volte ao analisador.';
const NOTA_DESCARTE =
  'O vídeo serve só para esta avaliação: ao parar, abre no analisador com o FPS já preenchido e é descartado quando a avaliação termina.';

export default function TelaCamera() {
  const router = useRouter();
  const { rascunho } = useRascunhoAvaliacao();
  const parametros = useLocalSearchParams<{ perna?: string; tentativa?: string }>();
  if (!rascunho) return <Redirect href="/" />;
  const alvo = lerPernaETentativa(parametros.perna, parametros.tentativa);
  if (!alvo) {
    return (
      <Centro>
        <Text className="text-center text-sm text-erro">{MENSAGEM_TENTATIVA_INVALIDA}</Text>
        <Botao rotulo="Voltar" aoTocar={() => router.back()} />
      </Centro>
    );
  }
  return <Gravacao perna={alvo.perna} numero={alvo.numero} />;
}

function Gravacao({ perna, numero }: { perna: PernaTentativa; numero: NumeroTentativa }) {
  const router = useRouter();
  const { usarVideoGravado, escolherVideo, mensagem } = useTentativaAtual(perna, numero);
  const g = useGravacaoAltaVelocidade();

  if (g.estado === 'sem_permissao' || g.estado === 'permissao_negada') {
    const negada = g.estado === 'permissao_negada';
    return (
      <Centro>
        <Text className="text-center text-sm text-texto">
          {negada ? MENSAGEM_CAMERA_NEGADA : MENSAGEM_MOTIVO_CAMERA}
        </Text>
        <Botao
          rotulo={negada ? 'Abrir configurações' : 'Permitir câmera'}
          aoTocar={negada ? g.abrirConfiguracoes : () => void g.pedirPermissao()}
        />
      </Centro>
    );
  }
  if (g.estado === 'sem_alta_velocidade') {
    return (
      <SemCameraLenta
        aoEscolherDaGaleria={escolherVideo}
        aoConcluir={() => router.back()}
        mensagemGaleria={mensagem}
      />
    );
  }
  if (!g.propsCamera) {
    return (
      <Centro>
        <Text className="text-center text-sm text-textoSecundario">{MENSAGEM_PREPARANDO}</Text>
      </Centro>
    );
  }

  async function aoTocarGravar() {
    if (g.estado !== 'gravando') return g.gravar();
    const video = await g.parar();
    if (!video) return;
    usarVideoGravado(video);
    router.back();
  }

  const gravando = g.estado === 'gravando';
  const alternativa = g.taxa === null ? null : taxaAlternativa(g.taxa, g.suportadas);
  return (
    <View className="flex-1 bg-fundo">
      <View className="flex-1">
        <CameraAltaVelocidade {...g.propsCamera} testID="camera" style={{ flex: 1 }} />
        <LinhaGuia />
        {gravando && g.taxa ? <IndicadorGravacao segundos={g.segundos} taxa={g.taxa} /> : null}
      </View>
      <View className="gap-3 p-4">
        {g.estado === 'taxa_nao_suportada' && alternativa ? (
          <AvisoTaxaNaoSuportada
            alternativa={alternativa}
            aoUsarAlternativa={() => g.escolherTaxa(alternativa)}
          />
        ) : null}
        {g.aviso ? <Text className="text-xs text-aviso">{g.aviso}</Text> : null}
        {g.mensagemErro ? (
          <Text accessibilityRole="alert" className="text-xs text-erro" onPress={g.tentarDeNovo}>
            {g.mensagemErro}
          </Text>
        ) : null}
        <View className="flex-row items-center justify-between">
          <SeletorTaxa taxa={g.taxa} bloqueado={gravando} aoEscolher={g.escolherTaxa} />
          <BotaoGravar
            gravando={gravando}
            liberado={gravando || g.estado === 'pronta'}
            aoTocar={aoTocarGravar}
          />
        </View>
        <Text className="text-xs text-textoSecundario">{NOTA_DESCARTE}</Text>
      </View>
    </View>
  );
}

function BotaoGravar(props: { gravando: boolean; liberado: boolean; aoTocar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.gravando ? 'Parar' : 'Gravar'}
      accessibilityState={{ disabled: !props.liberado }}
      disabled={!props.liberado}
      onPress={props.aoTocar}
      className={`h-16 w-16 items-center justify-center rounded-full border-4 border-texto ${props.liberado ? '' : 'opacity-40'}`}
    >
      <View
        className={props.gravando ? 'h-6 w-6 rounded bg-erro' : 'h-12 w-12 rounded-full bg-erro'}
      />
    </Pressable>
  );
}

function Centro({ children }: { children: ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-4 bg-fundo p-6">{children}</View>;
}

function Botao({ rotulo, aoTocar }: { rotulo: string; aoTocar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={aoTocar}
      className="rounded-2xl bg-destaque px-6 py-3"
    >
      <Text className="text-sm font-semibold text-fundo">{rotulo}</Text>
    </Pressable>
  );
}
