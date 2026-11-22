import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { BotaoNovoPaciente } from '@/components/BotaoNovoPaciente';
import { CampoBusca } from '@/components/CampoBusca';
import { FiltroPerfil } from '@/components/FiltroPerfil';
import { ItemPaciente } from '@/components/ItemPaciente';
import { ListaPacientesVazia } from '@/components/ListaPacientesVazia';
import { TopoParallax } from '@/components/TopoParallax';
import { useListaPacientes } from '@/hooks/useListaPacientes';
import { useParallaxSalto } from '@/hooks/useParallaxSalto';
import { useSincronizacao } from '@/hooks/useSincronizacao';
import type { FiltroPerfil as Filtro } from '@/types/patient';
import { hojeIso } from '@/utils/datas';
import { filtrarPacientes } from '@/utils/filtroPacientes';
import { ESPACO_FINAL_PX, SUBIDA_LISTA_PX } from '@/utils/poseDesenho';

const ALTURA_TOPO = 200;
/** Uma leitura de rolagem por quadro, para o personagem acompanhar o dedo. */
const INTERVALO_ROLAGEM_MS = 16;

export default function TelaPacientes() {
  const router = useRouter();
  const { pacientes, carregando } = useListaPacientes();
  const { pacientesPendentes, atualizarPendentes } = useSincronizacao();
  useFocusEffect(
    useCallback(() => {
      void atualizarPendentes();
    }, [atualizarPendentes]),
  );
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const parallax = useParallaxSalto(SUBIDA_LISTA_PX);
  const hoje = hojeIso();
  const lista = useMemo(
    () => filtrarPacientes(pacientes, filtro, busca),
    [pacientes, filtro, busca],
  );
  const abrirCadastro = () => router.push('/patient/new');

  return (
    <View className="flex-1 bg-fundo">
      <View className="gap-3 px-4 pt-3">
        <CampoBusca valor={busca} aoMudar={setBusca} />
        <FiltroPerfil valor={filtro} aoMudar={setFiltro} />
      </View>
      <FlatList
        data={lista}
        keyExtractor={(paciente) => paciente.id}
        renderItem={({ item }) => (
          <ItemPaciente
            paciente={item}
            hoje={hoje}
            aoTocar={() => router.push(`/patient/${item.id}`)}
            pendente={pacientesPendentes.has(item.id)}
          />
        )}
        onScroll={parallax.aoRolar}
        scrollEventThrottle={INTERVALO_ROLAGEM_MS}
        contentContainerClassName="px-4"
        ListHeaderComponent={
          <TopoParallax parallax={parallax} altura={ALTURA_TOPO}>
            <Text className="font-titulo text-3xl uppercase text-texto">Meça cada salto</Text>
            <Text className="text-xs text-textoSecundario">Role a lista para saltar</Text>
          </TopoParallax>
        }
        ListEmptyComponent={
          carregando ? undefined : (
            <ListaPacientesVazia semCadastro={pacientes.length === 0} aoNovo={abrirCadastro} />
          )
        }
        ListFooterComponent={<View testID="espaco-final" style={{ height: ESPACO_FINAL_PX }} />}
      />
      {lista.length > 0 && (
        <View className="absolute bottom-4 right-4">
          <BotaoNovoPaciente aoTocar={abrirCadastro} />
        </View>
      )}
    </View>
  );
}
