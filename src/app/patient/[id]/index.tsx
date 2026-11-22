import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { CartaoMedida, type CorCartao } from '@/components/CartaoMedida';
import { DadosPaciente } from '@/components/DadosPaciente';
import { ItemAvaliacao } from '@/components/ItemAvaliacao';
import { TopoParallax } from '@/components/TopoParallax';
import { useParallaxSalto, type ParallaxSalto } from '@/hooks/useParallaxSalto';
import { usePerfilPaciente } from '@/hooks/usePerfilPaciente';
import type { AvaliacaoDoHistorico } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import type { CorLsi } from '@/types/resultadoSalto';
import { calcularIdade, dataHoraParaBr, hojeIso } from '@/utils/datas';
import { CASAS_ALTURA, CASAS_LSI, CASAS_RSI, formatarDecimal } from '@/utils/formatacao';
import { ESPACO_FINAL_PX, saltoDoDesenhoPx } from '@/utils/poseDesenho';
import { PROTOCOLOS } from '@/utils/protocolos';
import { ultimoLsi, ultimoRsi, ultimoSalto } from '@/utils/resumoPerfil';
import { ROTULO_PERFIL } from '@/utils/rotulos';

const ALTURA_TOPO = 210;
/** Uma leitura de rolagem por quadro, para o personagem acompanhar o dedo. */
const INTERVALO_ROLAGEM_MS = 16;

const COR_DO_CARTAO: Record<CorLsi, CorCartao | undefined> = {
  verde: 'verde',
  amarelo: 'amarelo',
  vermelho: 'vermelho',
  neutro: undefined,
};

const BASE_DO_LSI = { altura: 'Base: altura (CMJ)', rsi: 'Base: RSI (Drop Jump)' } as const;

/**
 * Perfil do paciente (HU003): dados, último LSI e último RSI, histórico de avaliações (mais recente
 * primeiro) e o topo com o personagem saltando a altura do último salto.
 */
export default function TelaPerfilPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { paciente, avaliacoes, carregando, naoEncontrado } = usePerfilPaciente(id);
  const alturaUltimoSalto = ultimoSalto(avaliacoes);
  const parallax = useParallaxSalto(saltoDoDesenhoPx(alturaUltimoSalto));

  if (naoEncontrado) return <PacienteNaoEncontrado aoVoltar={() => router.replace('/')} />;
  if (carregando || !paciente) return <View className="flex-1 bg-fundo" />;

  return (
    <View className="flex-1 bg-fundo">
      <FlatList
        data={avaliacoes}
        keyExtractor={(avaliacao) => avaliacao.id}
        renderItem={({ item }) => (
          <ItemAvaliacao avaliacao={item} aoTocar={() => router.push(`/assessment/${item.id}`)} />
        )}
        onScroll={parallax.aoRolar}
        scrollEventThrottle={INTERVALO_ROLAGEM_MS}
        contentContainerClassName="gap-4 p-4 pb-28"
        ListHeaderComponent={
          <CabecalhoPerfil
            parallax={parallax}
            paciente={paciente}
            avaliacoes={avaliacoes}
            alturaUltimoSalto={alturaUltimoSalto}
            aoEditar={() => router.push(`/patient/${paciente.id}/edit`)}
          />
        }
        ListFooterComponent={<View testID="espaco-final" style={{ height: ESPACO_FINAL_PX }} />}
        ListEmptyComponent={
          <Text className="rounded-2xl border border-borda bg-cartao p-4 text-center text-sm text-textoSecundario">
            Nenhuma avaliação ainda.
          </Text>
        }
      />
      <View className="absolute inset-x-0 bottom-0 border-t border-borda bg-fundo p-4">
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/assessment/setup', params: { pacienteId: paciente.id } })
          }
          className="items-center rounded-2xl bg-destaque py-4"
        >
          <Text className="text-sm font-semibold text-fundo">+ Nova Avaliação</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface CabecalhoPerfilProps {
  parallax: ParallaxSalto;
  paciente: Patient;
  avaliacoes: AvaliacaoDoHistorico[];
  alturaUltimoSalto: number | null;
  aoEditar: () => void;
}

function CabecalhoPerfil({
  parallax,
  paciente,
  avaliacoes,
  alturaUltimoSalto,
  aoEditar,
}: CabecalhoPerfilProps) {
  const lsi = ultimoLsi(avaliacoes);
  const rsi = ultimoRsi(avaliacoes);
  return (
    <View className="gap-4">
      <TopoParallax parallax={parallax} altura={ALTURA_TOPO}>
        <Text className="text-[11px] font-semibold uppercase tracking-wider text-destaque">
          Último salto
        </Text>
        <Text className="font-titulo text-4xl uppercase text-texto">
          {alturaUltimoSalto === null
            ? 'Sem avaliações'
            : `${formatarDecimal(alturaUltimoSalto, CASAS_ALTURA)} cm`}
        </Text>
      </TopoParallax>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-titulo text-3xl uppercase text-texto">{paciente.nome}</Text>
          <Text className="text-xs text-textoSecundario">
            {ROTULO_PERFIL[paciente.perfil]} · {calcularIdade(paciente.dataNascimento, hojeIso())}{' '}
            anos
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={aoEditar} className="rounded-full px-3 py-2">
          <Text className="text-sm font-semibold text-destaque">Editar</Text>
        </Pressable>
      </View>
      <DadosPaciente paciente={paciente} />
      <View className="flex-row gap-3">
        <CartaoMedida
          rotulo="Último LSI"
          valor={
            lsi === null
              ? null
              : lsi.valor === null
                ? 'LSI não calculado'
                : `${formatarDecimal(lsi.valor, CASAS_LSI)}%`
          }
          cor={lsi?.cor ? COR_DO_CARTAO[lsi.cor] : undefined}
          rodape={lsi ? `${BASE_DO_LSI[lsi.base]} · ${dataHoraParaBr(lsi.dataHora)}` : undefined}
        />
        <CartaoMedida
          rotulo="Último RSI"
          valor={rsi === null ? null : formatarDecimal(rsi.valor, CASAS_RSI)}
          rodape={
            rsi ? `${PROTOCOLOS[rsi.protocolo].nome} · ${dataHoraParaBr(rsi.dataHora)}` : undefined
          }
        />
      </View>
      <Text className="text-sm font-semibold text-textoSecundario">Avaliações</Text>
    </View>
  );
}

function PacienteNaoEncontrado({ aoVoltar }: { aoVoltar: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-fundo p-6">
      <Text className="text-center text-base text-texto">Paciente não encontrado.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={aoVoltar}
        className="rounded-2xl bg-destaque px-6 py-3"
      >
        <Text className="font-semibold text-fundo">Voltar</Text>
      </Pressable>
    </View>
  );
}
