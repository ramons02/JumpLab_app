import { usePreventRemove, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { AvisoFps } from '@/components/AvisoFps';
import { CamadaToqueVideo, type MarcadorImagem } from '@/components/CamadaToqueVideo';
import { PainelAgachamento } from '@/components/PainelAgachamento';
import { PlayerQuadros } from '@/components/PlayerQuadros';
import { SeletorFps } from '@/components/SeletorFps';
import { VideoDaTentativa } from '@/components/VideoDaTentativa';
import { useAbrirCamera } from '@/hooks/useAbrirCamera';
import { useMarcacaoAgachamento, type AlvoMarcacao } from '@/hooks/useMarcacaoAgachamento';
import { usePerfilPaciente } from '@/hooks/usePerfilPaciente';
import { useRascunhoAvaliacao, type RascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import { useTentativaAtual } from '@/hooks/useTentativaAtual';
import type { SerieEmAndamento } from '@/types/squat';
import { avisoDoFps } from '@/utils/fps';
import { CASAS_CARGA, formatarDecimal } from '@/utils/formatacao';
import { PROTOCOLOS } from '@/utils/protocolos';
import { descartarVideos } from '@/video/descartarVideos';

const ROTULO_EVENTO = { inicio: 'início', fundo: 'fundo', fim: 'fim' } as const;

function avisoDoAlvo(alvo: AlvoMarcacao | null): string | null {
  if (alvo === null) return null;
  if (alvo === 'topo') return 'Toque no topo do disco';
  if (alvo === 'base') return 'Toque na base do disco';
  return 'Toque na barra';
}

/** Linhas do disco e as marcas da barra feitas no quadro mostrado. */
function marcadoresDoQuadro(serie: SerieEmAndamento, quadro: number): MarcadorImagem[] {
  const lista: MarcadorImagem[] = [];
  const { calibracao } = serie;
  if (calibracao) {
    lista.push({ chave: 'topo', yVideo: calibracao.topoY, rotulo: 'topo do disco', tipo: 'disco' });
    if (calibracao.baseY !== null) {
      lista.push({
        chave: 'base',
        yVideo: calibracao.baseY,
        rotulo: 'base do disco',
        tipo: 'disco',
      });
    }
  }
  serie.repeticoes.forEach((repeticao, indice) => {
    (['inicio', 'fundo', 'fim'] as const).forEach((evento) => {
      const marca = repeticao[evento];
      if (marca && marca.quadro === quadro) {
        lista.push({
          chave: `${indice}-${evento}`,
          yVideo: marca.y,
          rotulo: `rep ${indice + 1} · ${ROTULO_EVENTO[evento]}`,
          tipo: 'barra',
        });
      }
    });
  });
  return lista;
}

/** Analisador do agachamento com barra (HU014): série única, calibração pelo disco e repetições. */
export function AnalisadorAgachamento({ rascunho }: { rascunho: RascunhoAvaliacao }) {
  const router = useRouter();
  const { descartarRascunho } = useRascunhoAvaliacao();
  const { paciente } = usePerfilPaciente(rascunho.pacienteId);
  const atual = useTentativaAtual('unica', 1);
  const gravar = useAbrirCamera('unica', 1);
  const { tentativa } = atual;
  const uri = tentativa.video?.uri ?? null;
  const [estadoQuadro, setEstadoQuadro] = useState({ uri, quadro: 0 });
  if (estadoQuadro.uri !== uri) setEstadoQuadro({ uri, quadro: 0 });
  const quadro = estadoQuadro.uri === uri ? estadoQuadro.quadro : 0;
  const mudarQuadro = useCallback((novo: number) => setEstadoQuadro({ uri, quadro: novo }), [uri]);
  const marcacao = useMarcacaoAgachamento(quadro);
  const fpsConfirmado = tentativa.fpsConfirmado;
  const aviso = fpsConfirmado === null ? null : avisoDoFps(fpsConfirmado, false);

  usePreventRemove(tentativa.video !== null, ({ repeat }) => {
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
        {PROTOCOLOS.agach.nome}
        {rascunho.cargaKg ? ` · ${formatarDecimal(rascunho.cargaKg, CASAS_CARGA)} kg` : ''}
        {paciente ? ` · ${paciente.nome}` : ''}
      </Text>
      {tentativa.video === null ? (
        <View className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
          <Text className="text-sm font-semibold text-texto">Vídeo da série, filmado de lado</Text>
          <Pressable
            accessibilityRole="button"
            onPress={atual.escolherVideo}
            className="items-center rounded-2xl bg-destaque py-4"
          >
            <Text className="text-sm font-semibold text-fundo">Escolher vídeo da galeria</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={gravar}
            className="items-center rounded-2xl border border-destaque py-4"
          >
            <Text className="text-sm font-semibold text-destaque">Gravar com a câmera</Text>
          </Pressable>
          {atual.mensagem ? <Text className="text-xs text-erro">{atual.mensagem}</Text> : null}
        </View>
      ) : (
        <>
          <VideoDaTentativa
            perna="unica"
            numero={1}
            video={tentativa.video}
            fpsConfirmado={fpsConfirmado}
            aoTrocarFps={atual.trocarFps}
            aoTrocarVideo={atual.escolherVideo}
          />
          {fpsConfirmado === null ? (
            <SeletorFps
              fpsLido={tentativa.video.fpsLido}
              selecionado={tentativa.fpsSelecionado}
              ehSalto={false}
              aoSelecionar={atual.selecionarFps}
              aoConfirmar={atual.confirmarFps}
            />
          ) : null}
          {aviso ? <AvisoFps aviso={aviso} /> : null}
          <PlayerQuadros
            key={tentativa.video.uri}
            video={tentativa.video}
            fpsConfirmado={fpsConfirmado}
            quadro={quadro}
            onMudarQuadro={mudarQuadro}
            camadaSobreImagem={(area, video) => (
              <CamadaToqueVideo
                area={area}
                video={video}
                aviso={avisoDoAlvo(marcacao.armado)}
                aoTocar={marcacao.tocarNaImagem}
                marcadores={marcadoresDoQuadro(marcacao.serie, quadro)}
              />
            )}
          />
          <PainelAgachamento marcacao={marcacao} fpsConfirmado={fpsConfirmado !== null} />
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !marcacao.podeVerResultado }}
        disabled={!marcacao.podeVerResultado}
        onPress={() => router.push('/assessment/result')}
        className={`items-center rounded-2xl py-4 ${
          marcacao.podeVerResultado ? 'bg-destaque' : 'bg-destaqueFundo'
        }`}
      >
        <Text
          className={`font-semibold ${marcacao.podeVerResultado ? 'text-fundo' : 'text-textoSecundario'}`}
        >
          Ver resultado
        </Text>
      </Pressable>
    </ScrollView>
  );
}
