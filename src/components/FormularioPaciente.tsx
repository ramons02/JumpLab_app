import { usePreventRemove } from 'expo-router';
import { useRef } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { CampoData } from '@/components/CampoData';
import { CampoTexto } from '@/components/CampoTexto';
import { SeletorOpcoes } from '@/components/SeletorOpcoes';
import { useFormularioPaciente } from '@/hooks/useFormularioPaciente';
import type { DadosPaciente, Patient, Perfil, PernaLesionada } from '@/types/patient';
import { ROTULO_PERFIL, ROTULO_PERNA } from '@/utils/rotulos';

const OPCOES_PERFIL = Object.entries(ROTULO_PERFIL) as [Perfil, string][];
const OPCOES_PERNA = Object.entries(ROTULO_PERNA) as [PernaLesionada, string][];

interface FormularioPacienteProps {
  gravar: (dados: DadosPaciente) => Promise<void>;
  /** Chamado depois de gravar, para a tela sair. */
  aoSalvar: () => void;
  pacienteInicial?: Patient;
}

export function FormularioPaciente({ gravar, aoSalvar, pacienteInicial }: FormularioPacienteProps) {
  const formulario = useFormularioPaciente(gravar, pacienteInicial);
  const { valores, erros, salvando, alterado, mudar } = formulario;
  const saindoDepoisDeSalvar = useRef(false);

  usePreventRemove(alterado, ({ repeat }) => {
    if (saindoDepoisDeSalvar.current) {
      repeat();
      return;
    }
    Alert.alert('Descartar alterações?', 'Os dados digitados ainda não foram salvos.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: repeat },
    ]);
  });

  async function salvar() {
    try {
      if (await formulario.salvar()) {
        saindoDepoisDeSalvar.current = true;
        aoSalvar();
      }
    } catch {
      Alert.alert(
        'Não foi possível salvar',
        'Tente de novo. Os dados digitados continuam na tela.',
      );
    }
  }

  const rotuloDataLesao =
    valores.perfil === 'corredor' ? 'Data da lesão (opcional)' : 'Data da cirurgia';

  return (
    <View className="flex-1 bg-fundo">
      <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
        <CampoTexto
          rotulo="Nome"
          valor={valores.nome}
          aoMudar={(valor) => mudar('nome', valor)}
          erro={erros.nome}
          placeholder="Nome completo"
          autoCapitalize="words"
        />
        <CampoData
          rotulo="Data de nascimento"
          valor={valores.dataNascimento}
          aoMudar={(valor) => mudar('dataNascimento', valor)}
          erro={erros.dataNascimento}
          mostrarIdade
        />
        <SeletorOpcoes
          rotulo="Perfil"
          opcoes={OPCOES_PERFIL}
          valor={valores.perfil}
          aoMudar={(valor) => mudar('perfil', valor)}
          erro={erros.perfil}
        />
        <SeletorOpcoes
          rotulo="Perna lesionada"
          opcoes={OPCOES_PERNA}
          valor={valores.pernaLesionada}
          aoMudar={(valor) => mudar('pernaLesionada', valor)}
          erro={erros.pernaLesionada}
        />
        <CampoData
          rotulo={rotuloDataLesao}
          valor={valores.dataLesao}
          aoMudar={(valor) => mudar('dataLesao', valor)}
          erro={erros.dataLesao}
        />
      </ScrollView>
      <View className="border-t border-borda bg-superficie p-4">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: salvando }}
          disabled={salvando}
          onPress={salvar}
          className={`items-center rounded-2xl py-4 ${salvando ? 'bg-marca-fraca' : 'bg-marca'}`}
        >
          <Text className="text-base font-semibold text-fundo">
            {salvando ? 'Salvando...' : 'Salvar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
