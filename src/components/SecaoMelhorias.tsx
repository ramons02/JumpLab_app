import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { MapaMuscular } from '@/components/MapaMuscular';
import { TabelaLocais } from '@/components/TabelaLocais';
import cores from '@/theme/cores';
import type { PontoMelhoria } from '@/types/melhoria';
import {
  consolidarGrupos,
  criarPontoLivre,
  ROTULO_GRUPO,
  type AvaliacaoParaMelhorias,
} from '@/utils/melhorias';

interface SecaoMelhoriasProps {
  pontos: PontoMelhoria[];
  avaliacao: AvaliacaoParaMelhorias & { dataHora: string };
  /** Resultado novo: o avaliador remove e acrescenta pontos antes de salvar. */
  editavel?: boolean;
  aoMudar?: (pontos: PontoMelhoria[]) => void;
}

function gruposDoPonto(ponto: PontoMelhoria): string {
  return ponto.grupos.map(({ grupo }) => ROTULO_GRUPO[grupo]).join(', ');
}

/** "O que melhorar": mapa muscular, tabela dos locais e a lista de pontos (HU017). */
export function SecaoMelhorias({
  pontos,
  avaliacao,
  editavel = false,
  aoMudar,
}: SecaoMelhoriasProps) {
  const [novo, setNovo] = useState('');
  const podeIncluir = novo.trim() !== '';

  function incluir() {
    if (!podeIncluir) return;
    aoMudar?.([...pontos, criarPontoLivre(novo)]);
    setNovo('');
  }

  return (
    <View testID="secao-melhorias" className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-texto">O que melhorar</Text>
        {editavel ? (
          <Text className="text-[11px] text-textoSecundario">sugerido pelas medidas · revise</Text>
        ) : null}
      </View>

      {pontos.length === 0 ? (
        <Text className="text-xs text-textoSecundario">
          Nenhum ponto abaixo das referências nesta avaliação.
        </Text>
      ) : (
        <>
          <Text className="text-[11px] font-semibold uppercase text-textoSecundario">
            Grupos musculares a fortalecer
          </Text>
          <MapaMuscular grupos={consolidarGrupos(pontos)} protocolo={avaliacao.protocolo} />
          <TabelaLocais pontos={pontos} avaliacao={avaliacao} />
        </>
      )}

      {pontos.map((ponto, indice) => (
        <View
          key={`${ponto.titulo}-${indice}`}
          className="flex-row gap-2 rounded-xl border border-borda bg-fundo p-3"
        >
          <View className="mt-1.5 h-2 w-2 rounded-full bg-destaque" />
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-texto">{ponto.titulo}</Text>
            {ponto.grupos.length > 0 ? (
              <Text className="text-xs text-destaque">{gruposDoPonto(ponto)}</Text>
            ) : null}
            {ponto.foco ? <Text className="text-xs text-textoSecundario">{ponto.foco}</Text> : null}
          </View>
          {editavel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover ponto ${ponto.titulo}`}
              hitSlop={8}
              onPress={() => aoMudar?.(pontos.filter((_, i) => i !== indice))}
              className="h-6 w-6 items-center justify-center rounded-full"
            >
              <Text className="text-base text-textoSecundario">×</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {editavel ? (
        <View className="flex-row gap-2">
          <TextInput
            accessibilityLabel="Acrescentar ponto"
            value={novo}
            onChangeText={setNovo}
            placeholder="Acrescentar ponto (ex.: glúteo médio)"
            placeholderTextColor={cores.textoSecundario}
            className="flex-1 rounded-xl border border-borda bg-fundo px-3 py-2 text-sm text-texto"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !podeIncluir }}
            disabled={!podeIncluir}
            onPress={incluir}
            className={`items-center justify-center rounded-xl border border-destaque px-3 ${
              podeIncluir ? '' : 'opacity-40'
            }`}
          >
            <Text className="text-sm font-semibold text-destaque">Incluir</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
