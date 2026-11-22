import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { listarParesSugeridoMarcado } from '@/database/testeSugestao';
import { usePreferencias } from '@/hooks/usePreferencias';
import type { ResumoTesteSugestao } from '@/types/sugestao';
import {
  LIMITE_QUADROS_TESTE,
  percentualDentro,
  resumoTesteSugestao,
} from '@/utils/resumoTesteSugestao';

/** Resumo do teste de precisão, relido sempre que a tela de Configurações ganha o foco. */
function useResumoTeste(): ResumoTesteSugestao | null {
  const db = useSQLiteContext();
  const [resumo, setResumo] = useState<ResumoTesteSugestao | null>(null);
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarParesSugeridoMarcado(db).then((pares) => {
        if (ativo) setResumo(resumoTesteSugestao(pares));
      });
      return () => {
        ativo = false;
      };
    }, [db]),
  );
  return resumo;
}

/**
 * Chave "Sugestão automática (em teste)" e resumo do teste de precisão (spec 018, RN13 e RN15). A
 * função só é liberada para todos se o resumo passar da meta no aparelho do avaliador.
 */
export function SecaoSugestaoAutomatica() {
  const { sugestaoLigada, carregando, definirSugestaoLigada } = usePreferencias();
  const resumo = useResumoTeste();

  return (
    <View className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
      <Text className="text-sm font-semibold text-texto">Sugestão automática dos quadros</Text>
      <Text className="text-xs text-textoSecundario">
        Em teste. Com a chave ligada, o analisador oferece o botão Sugerir quadros: o app procura no
        vídeo os quadros do salto pelo movimento dos pés, no aparelho e sem internet. Você confere e
        marca cada quadro como de costume.
      </Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-texto">Sugestão automática (em teste)</Text>
        <Switch
          accessibilityLabel="Sugestão automática (em teste)"
          value={sugestaoLigada}
          disabled={carregando}
          onValueChange={(ligada) => void definirSugestaoLigada(ligada)}
        />
      </View>
      {resumo === null ? null : resumo.total === 0 ? (
        <Text className="text-xs text-textoSecundario">
          Nenhuma avaliação salva com sugestão ainda.
        </Text>
      ) : (
        <View testID="resumo-teste-sugestao" className="gap-1">
          <Text className="text-xs font-semibold text-texto">
            Eventos a até {LIMITE_QUADROS_TESTE} quadros da sua marcação
          </Text>
          {resumo.grupos
            .filter((g) => g.total > 0)
            .map((g) => (
              <Text key={g.nome} className="text-xs text-textoSecundario">
                {g.nome}: {g.dentro} de {g.total} ({percentualDentro(g)}%)
              </Text>
            ))}
          <Text className="text-xs font-semibold text-texto">
            Total: {resumo.dentro} de {resumo.total} ({percentualDentro(resumo)}%) · meta{' '}
            {resumo.meta}%
          </Text>
        </View>
      )}
    </View>
  );
}
