import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { CartaoMedida } from '@/components/CartaoMedida';
import { DadosPaciente } from '@/components/DadosPaciente';
import { usePerfilPaciente } from '@/hooks/usePerfilPaciente';
import type { Patient } from '@/types/patient';
import { calcularIdade, hojeIso } from '@/utils/datas';
import { ROTULO_PERFIL } from '@/utils/rotulos';

/**
 * Perfil do paciente, entrega 1 da HU003 (D17): dados, cards e histórico ainda vazios.
 * Os valores dos cards e o histórico chegam na entrega 2 (depois das specs 006 a 008);
 * o topo com o personagem chega quando a spec 002 entregar o TopoParallax.
 */
export default function TelaPerfilPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { paciente, carregando, naoEncontrado } = usePerfilPaciente(id);

  if (naoEncontrado) return <PacienteNaoEncontrado aoVoltar={() => router.replace('/')} />;
  if (carregando || !paciente) return <View className="flex-1 bg-fundo" />;

  return (
    <View className="flex-1 bg-fundo">
      <FlatList
        data={[]}
        renderItem={() => null}
        contentContainerClassName="gap-4 p-4 pb-28"
        ListHeaderComponent={
          <CabecalhoPerfil
            paciente={paciente}
            aoEditar={() => router.push(`/patient/${paciente.id}/edit`)}
          />
        }
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

function CabecalhoPerfil({ paciente, aoEditar }: { paciente: Patient; aoEditar: () => void }) {
  return (
    <View className="gap-4">
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
        <CartaoMedida rotulo="Último LSI" valor={null} />
        <CartaoMedida rotulo="Último RSI" valor={null} />
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
