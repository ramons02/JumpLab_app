import { Pressable, Text, View } from 'react-native';

import type { EventoSalto, MarcasSalto } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { eventosDoProtocolo, rotuloDoEvento } from '@/utils/marcacoes';
import { textoDoAjuste } from '@/utils/sugestaoQuadros';

interface BotoesMarcacaoProps {
  protocolo: Protocol;
  marcas: MarcasSalto;
  liberadas: boolean;
  aoMarcar: (evento: EventoSalto) => void;
  /** Quadros da sugestão pronta (spec 018); com eles, o evento marcado diz se conferiu ou ajustou. */
  quadrosSugeridos?: MarcasSalto;
  /** Evento do passo guiado, destacado (D23). */
  proximo?: EventoSalto | null;
  /** Atalho `Ir ao quadro N` de cada evento marcado (D23). */
  aoIrAoQuadro?: (quadro: number) => void;
}

/** Um botão por evento do protocolo; marca no quadro atual do vídeo (spec 007). */
export function BotoesMarcacao({
  protocolo,
  marcas,
  liberadas,
  aoMarcar,
  quadrosSugeridos,
  proximo = null,
  aoIrAoQuadro,
}: BotoesMarcacaoProps) {
  return (
    <View className="flex-row gap-2">
      {eventosDoProtocolo(protocolo).map((evento) => {
        const rotulo = rotuloDoEvento(evento, protocolo);
        const quadro = marcas[evento];
        const marcado = quadro !== undefined;
        const sugerido = quadrosSugeridos?.[evento];
        const destaque = !marcado && evento === proximo && liberadas;
        return (
          <View key={evento} className="flex-1 gap-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={rotulo}
              accessibilityState={{ disabled: !liberadas }}
              disabled={!liberadas}
              onPress={() => aoMarcar(evento)}
              className={`items-center rounded-xl border px-1 py-3 ${
                marcado
                  ? 'border-destaque bg-destaqueFundo'
                  : destaque
                    ? 'border-aviso bg-aviso-fundo'
                    : 'border-borda bg-cartao'
              } ${liberadas ? '' : 'opacity-40'}`}
            >
              <Text className={`text-xs font-semibold ${marcado ? 'text-destaque' : 'text-texto'}`}>
                {rotulo}
              </Text>
              <Text className="mt-0.5 text-[11px] text-textoSecundario">
                {marcado ? `quadro ${quadro}` : 'não marcado'}
              </Text>
              {marcado && sugerido !== undefined ? (
                <Text
                  className={`mt-0.5 text-[11px] font-semibold ${
                    quadro === sugerido ? 'text-destaque' : 'text-aviso'
                  }`}
                >
                  {textoDoAjuste(sugerido, quadro)}
                </Text>
              ) : null}
            </Pressable>
            {marcado && aoIrAoQuadro ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ir ao quadro ${quadro}`}
                onPress={() => aoIrAoQuadro(quadro)}
                className="items-center py-1"
              >
                <Text className="text-xs font-semibold text-destaque">Ir ao quadro {quadro}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
