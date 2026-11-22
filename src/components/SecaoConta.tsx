import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { FormularioConta, type ModoConta } from '@/components/FormularioConta';
import { useSessao } from '@/hooks/useSessao';

export const TEXTO_CONTA_OPCIONAL =
  'A conta serve só para sincronizar. O app funciona inteiro sem ela.';
export const MENSAGEM_SAIU = 'Você saiu. Os dados locais continuam no aparelho.';
export const MENSAGEM_EXPIROU = 'Sua sessão expirou. Entre de novo para sincronizar.';

function Alternar({ modo, aoMudar }: { modo: ModoConta; aoMudar: (m: ModoConta) => void }) {
  return (
    <View className="flex-row gap-2">
      {(['entrar', 'criar'] as const).map((opcao) => (
        <Pressable
          key={opcao}
          accessibilityRole="tab"
          accessibilityState={{ selected: modo === opcao }}
          onPress={() => aoMudar(opcao)}
          className={`flex-1 items-center rounded-xl border py-2 ${
            modo === opcao ? 'border-destaque bg-destaqueFundo' : 'border-borda'
          }`}
        >
          <Text className="text-sm font-semibold text-texto">
            {opcao === 'entrar' ? 'Entrar' : 'Criar conta'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Seção Conta das Configurações (spec 012): opcional, só para sincronizar. */
export function SecaoConta() {
  const { carregando, conta, expirou, entrar, criarConta, sair } = useSessao();
  const [modo, setModo] = useState<ModoConta>('entrar');
  const [aviso, setAviso] = useState<string | null>(null);

  function confirmarSaida() {
    Alert.alert(
      'Sair da conta?',
      'O token é apagado do aparelho. Os dados locais continuam aqui.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await sair();
            setAviso(MENSAGEM_SAIU);
          },
        },
      ],
    );
  }

  return (
    <View testID="secao-conta" className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
      <Text className="text-sm font-semibold text-texto">Conta</Text>
      {carregando ? null : conta ? (
        <>
          <Text className="text-xs text-textoSecundario">Conectado como</Text>
          <Text className="text-base text-texto">{conta.email}</Text>
          {aviso ? <Text className="text-xs text-destaque">{aviso}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={confirmarSaida}
            className="items-center rounded-2xl border border-destaque py-3"
          >
            <Text className="text-sm font-semibold text-destaque">Sair</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="text-xs text-textoSecundario">{TEXTO_CONTA_OPCIONAL}</Text>
          {expirou ? <Text className="text-xs text-aviso">{MENSAGEM_EXPIROU}</Text> : null}
          {aviso ? <Text className="text-xs text-destaque">{aviso}</Text> : null}
          <Alternar
            modo={modo}
            aoMudar={(m) => {
              setModo(m);
              setAviso(null);
            }}
          />
          <FormularioConta
            key={modo}
            modo={modo}
            aoEntrar={entrar}
            aoCriar={criarConta}
            aoConcluir={setAviso}
          />
        </>
      )}
    </View>
  );
}
