import { Pressable, Text, View } from 'react-native';

import type { EventoSalto, MarcasSalto } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { eventosDoProtocolo, rotuloDoEvento } from '@/utils/marcacoes';

interface BotoesMarcacaoProps {
  protocolo: Protocol;
  marcas: MarcasSalto;
  liberadas: boolean;
  aoMarcar: (evento: EventoSalto) => void;
}

/** Um botão por evento do protocolo; marca no quadro atual do vídeo (spec 007). */
export function BotoesMarcacao({ protocolo, marcas, liberadas, aoMarcar }: BotoesMarcacaoProps) {
  return (
    <View className="flex-row gap-2">
      {eventosDoProtocolo(protocolo).map((evento) => {
        const rotulo = rotuloDoEvento(evento, protocolo);
        const quadro = marcas[evento];
        const marcado = quadro !== undefined;
        return (
          <Pressable
            key={evento}
            accessibilityRole="button"
            accessibilityLabel={rotulo}
            accessibilityState={{ disabled: !liberadas }}
            disabled={!liberadas}
            onPress={() => aoMarcar(evento)}
            className={`flex-1 items-center rounded-xl border px-1 py-3 ${
              marcado ? 'border-destaque bg-destaqueFundo' : 'border-borda bg-cartao'
            } ${liberadas ? '' : 'opacity-40'}`}
          >
            <Text className={`text-xs font-semibold ${marcado ? 'text-destaque' : 'text-texto'}`}>
              {rotulo}
            </Text>
            <Text className="mt-0.5 text-[11px] text-textoSecundario">
              {marcado ? `quadro ${quadro}` : 'não marcado'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
