import { Pressable, Text, View } from 'react-native';

import { useSincronizacao } from '@/hooks/useSincronizacao';
import type { EstadoExibido } from '@/types/sincronizacao';
import { instanteParaBr } from '@/utils/datas';

export const TEXTO_SINCRONIZACAO =
  'Automática ao abrir o app e ao salvar, quando há internet. Sobem só os dados e resultados, nunca os vídeos. O botão força na hora.';

function textoDoEstado(estado: EstadoExibido): string {
  switch (estado.tipo) {
    case 'sem-sessao':
      return 'Entre na conta para sincronizar.';
    case 'sincronizando':
      return 'Sincronizando...';
    case 'sincronizado':
      return 'Sincronizado';
    case 'pendente':
      return `${estado.quantidade} pendente(s)`;
    case 'erro':
      return `Erro: ${estado.motivo}`;
  }
}

/** Estado da sincronização nas Configurações (spec 013, RN06 e RN08). */
export function SecaoSincronizacao() {
  const { estado, ultimaSincronizacao, sincronizarAgora } = useSincronizacao();
  const indisponivel = estado.tipo === 'sem-sessao' || estado.tipo === 'sincronizando';
  const corDoEstado =
    estado.tipo === 'erro'
      ? 'text-erro'
      : estado.tipo === 'sincronizado'
        ? 'text-destaque'
        : 'text-texto';

  return (
    <View
      testID="secao-sincronizacao"
      className="gap-3 rounded-2xl border border-borda bg-cartao p-4"
    >
      <Text className="text-sm font-semibold text-texto">Sincronização</Text>
      <Text accessibilityLiveRegion="polite" className={`text-base ${corDoEstado}`}>
        {textoDoEstado(estado)}
      </Text>
      {estado.tipo === 'erro' && estado.quantidadePendente > 0 ? (
        <Text className="text-xs text-textoSecundario">
          {estado.quantidadePendente} pendente(s)
        </Text>
      ) : null}
      {estado.tipo !== 'sem-sessao' ? (
        <Text className="text-xs text-textoSecundario">
          Última sincronização:{' '}
          {ultimaSincronizacao ? instanteParaBr(ultimaSincronizacao) : 'Nunca'}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: indisponivel }}
        disabled={indisponivel}
        onPress={() => void sincronizarAgora()}
        className={`items-center rounded-2xl border border-destaque py-3 ${indisponivel ? 'opacity-40' : ''}`}
      >
        <Text className="text-sm font-semibold text-destaque">Sincronizar agora</Text>
      </Pressable>
      <Text className="text-xs text-textoSecundario">{TEXTO_SINCRONIZACAO}</Text>
    </View>
  );
}
