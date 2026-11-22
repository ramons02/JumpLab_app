import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { RodapeFixo } from '@/components/RodapeFixo';
import { CampoTexto } from '@/components/CampoTexto';
import { OpcaoProtocolo } from '@/components/OpcaoProtocolo';
import { buscarPaciente } from '@/database/pacientes';
import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import type { Patient } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import { dataHoraLocal } from '@/utils/datas';
import { ehUuid } from '@/utils/ids';
import { filtrarDecimal } from '@/utils/numeros';
import { ORDEM_PROTOCOLOS, PROTOCOLOS } from '@/utils/protocolos';
import { validarConfiguracao } from '@/utils/validacaoConfiguracao';

type Carga =
  { estado: 'carregando' } | { estado: 'encontrado'; paciente: Patient } | { estado: 'ausente' };
type Destino = '/assessment/how-to' | '/assessment/analyze';

/** Configuração da avaliação (HU004): protocolo e, no agachamento, a carga. Sem pré-teste (D10). */
export default function TelaConfiguracao() {
  const { pacienteId } = useLocalSearchParams<{ pacienteId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { iniciarRascunho } = useRascunhoAvaliacao();
  const idValido = typeof pacienteId === 'string' && ehUuid(pacienteId);
  const [carga, setCarga] = useState<Carga>({ estado: 'carregando' });
  const [protocolo, setProtocolo] = useState<Protocol | null>(null);
  const [cargaTexto, setCargaTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!idValido) return;
    let ativo = true;
    buscarPaciente(db, pacienteId).then((paciente) => {
      if (ativo) setCarga(paciente ? { estado: 'encontrado', paciente } : { estado: 'ausente' });
    });
    return () => {
      ativo = false;
    };
  }, [db, pacienteId, idValido]);

  if (!idValido || carga.estado === 'ausente') {
    return (
      <PacienteNaoEncontrado
        aoVoltar={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    );
  }
  if (carga.estado === 'carregando') return <View className="flex-1 bg-fundo" />;
  const { paciente } = carga;

  const escolher = (escolhido: Protocol) => {
    setProtocolo(escolhido);
    setErro(null);
  };

  const seguir = (destino: Destino) => {
    const resultado = validarConfiguracao(protocolo, cargaTexto);
    if (!resultado.ok || !protocolo) {
      setErro(resultado.ok ? null : resultado.erro);
      return;
    }
    iniciarRascunho({
      pacienteId: paciente.id,
      protocolo,
      cargaKg: resultado.cargaKg,
      dataHora: dataHoraLocal(new Date()),
      pernaLesionada: paciente.pernaLesionada,
    });
    router.push(destino);
  };

  return (
    <View className="flex-1 bg-fundo">
      <ScrollView contentContainerClassName="gap-3 p-4 pb-8">
        <Text className="text-xs text-textoSecundario">Paciente</Text>
        <Text className="-mt-2 font-titulo text-3xl uppercase text-texto">{paciente.nome}</Text>
        <Text className="text-sm font-semibold text-textoSecundario">Protocolo</Text>
        {ORDEM_PROTOCOLOS.map((opcao) => (
          <OpcaoProtocolo
            key={opcao}
            protocolo={opcao}
            selecionado={protocolo === opcao}
            aoEscolher={() => escolher(opcao)}
          />
        ))}
        {protocolo && PROTOCOLOS[protocolo].agachamento ? (
          <CampoTexto
            rotulo="Carga na barra (kg)"
            dica="Barra mais anilhas."
            valor={cargaTexto}
            aoMudar={(texto) => {
              setCargaTexto(filtrarDecimal(texto));
              setErro(null);
            }}
            keyboardType="decimal-pad"
            placeholder="Ex.: 60"
          />
        ) : null}
        {erro ? <Text className="text-sm font-medium text-erro">{erro}</Text> : null}
      </ScrollView>
      <RodapeFixo className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={() => seguir('/assessment/how-to')}
          className="flex-1 items-center rounded-2xl border border-destaque py-4"
        >
          <Text className="text-sm font-semibold text-destaque">Como fazer</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => seguir('/assessment/analyze')}
          className="flex-1 items-center rounded-2xl bg-destaque py-4"
        >
          <Text className="text-sm font-semibold text-fundo">Ir para o vídeo</Text>
        </Pressable>
      </RodapeFixo>
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
