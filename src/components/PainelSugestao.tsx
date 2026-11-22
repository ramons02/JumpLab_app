import { Pressable, Text, View } from 'react-native';

import type { EventoSalto, MarcasSalto, SugestaoQuadros } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { eventosDoProtocolo } from '@/utils/marcacoes';
import { textoDoAjuste } from '@/utils/sugestaoQuadros';

const NOME_EVENTO: Record<EventoSalto, string> = {
  toque: 'Toque no solo',
  decolagem: 'Decolagem',
  aterrissagem: 'Aterrissagem',
};

interface PainelSugestaoProps {
  protocolo: Protocol;
  sugestao: SugestaoQuadros | null;
  progresso: number | null;
  marcas: MarcasSalto;
  aoSugerir: () => void;
  aoIrAoQuadro: (quadro: number) => void;
}

/** "toque no solo, decolagem e aterrissagem" */
function listaDeEventos(eventos: EventoSalto[]): string {
  const nomes = eventos.map((e) => NOME_EVENTO[e].toLowerCase());
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0];
}

/**
 * Sugestão automática dos quadros (spec 018): oferta, análise em andamento, resultado com `Ir ao
 * quadro` ou "Não deu para sugerir". A sugestão nunca vira marcação sozinha (RN07).
 */
export function PainelSugestao({
  protocolo,
  sugestao,
  progresso,
  marcas,
  aoSugerir,
  aoIrAoQuadro,
}: PainelSugestaoProps) {
  const eventos = eventosDoProtocolo(protocolo);

  if (sugestao === null) {
    return (
      <View className="gap-2 rounded-2xl border border-borda bg-cartao p-4">
        <Text className="text-sm font-semibold text-texto">Sugestão automática</Text>
        <Text className="text-xs text-textoSecundario">
          O app procura no vídeo {listaDeEventos(eventos)} pelo movimento dos pés. A análise roda no
          aparelho, sem internet; o vídeo não sai do celular. Você confere cada quadro antes de
          marcar.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={aoSugerir}
          className="items-center rounded-xl border border-destaque py-2.5"
        >
          <Text className="text-sm font-semibold text-destaque">Sugerir quadros</Text>
        </Pressable>
      </View>
    );
  }

  if (sugestao.estado === 'analisando') {
    const fracao = Math.min(1, Math.max(0, progresso ?? 0));
    return (
      <View className="gap-2 rounded-2xl border border-borda bg-cartao p-4">
        <Text className="text-sm font-semibold text-texto">Analisando o vídeo no aparelho...</Text>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(fracao * 100) }}
          className="h-1.5 overflow-hidden rounded-full bg-borda"
        >
          <View className="h-full rounded-full bg-destaque" style={{ width: `${fracao * 100}%` }} />
        </View>
        <Text className="text-xs text-textoSecundario">
          Procurando os pés em cada quadro. Você pode marcar à mão enquanto isso.
        </Text>
      </View>
    );
  }

  if (sugestao.estado === 'falhou') {
    return (
      <View accessibilityRole="alert" className="gap-1 rounded-2xl bg-aviso-fundo p-4">
        <Text className="text-sm font-semibold text-aviso">Não deu para sugerir.</Text>
        <Text className="text-xs text-aviso">{sugestao.motivo} Marque os quadros à mão.</Text>
      </View>
    );
  }

  return (
    <View className="gap-2 rounded-2xl border border-destaque bg-cartao p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-texto">Sugestão automática</Text>
        <Text className="rounded-full bg-aviso-fundo px-2 py-0.5 text-[10px] font-semibold text-aviso">
          confira antes de marcar
        </Text>
      </View>
      {eventos.map((evento) => {
        const sugerido = sugestao.quadros[evento];
        if (sugerido === undefined) return null;
        const marcado = marcas[evento];
        return (
          <View
            key={evento}
            className="flex-row items-center gap-2 rounded-xl border border-borda p-2.5"
          >
            <View className="flex-1">
              <Text className="text-sm font-semibold text-texto">{NOME_EVENTO[evento]}</Text>
              <Text className="text-xs text-textoSecundario">sugerido no quadro {sugerido}</Text>
              {marcado !== undefined ? (
                <Text
                  className={`text-xs font-semibold ${
                    marcado === sugerido ? 'text-destaque' : 'text-aviso'
                  }`}
                >
                  marcado no quadro {marcado} · {textoDoAjuste(sugerido, marcado)}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ir ao quadro ${sugerido}`}
              onPress={() => aoIrAoQuadro(sugerido)}
              className="rounded-lg border border-destaque px-3 py-1.5"
            >
              <Text className="text-xs font-semibold text-destaque">Ir ao quadro</Text>
            </Pressable>
          </View>
        );
      })}
      <Text className="text-[11px] text-textoSecundario">
        Vá ao quadro sugerido, confira com [-1 Frame] e [+1 Frame] e toque no botão de marcar. A
        sugestão nunca vira marcação sozinha.
      </Text>
    </View>
  );
}
