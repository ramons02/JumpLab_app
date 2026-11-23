import { Text, View } from 'react-native';

import type { EventoSalto } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { DICA_EVENTO, eventosDoProtocolo, NOME_EVENTO } from '@/utils/marcacoes';

interface PassoGuiadoProps {
  protocolo: Protocol;
  evento: EventoSalto;
}

/** Passo guiado da marcação (D23): qual evento marcar agora e qual quadro procurar. */
export function PassoGuiado({ protocolo, evento }: PassoGuiadoProps) {
  const eventos = eventosDoProtocolo(protocolo);
  return (
    <View testID="passo-guiado" className="rounded-2xl border border-borda bg-cartao p-3">
      <Text className="text-[11px] font-extrabold uppercase tracking-wide text-destaque">
        {`Passo ${eventos.indexOf(evento) + 1} de ${eventos.length} · ${NOME_EVENTO[evento]}`}
      </Text>
      <Text className="mt-1 text-sm text-texto">
        {`${DICA_EVENTO[evento]} Use -1 e +1 para acertar.`}
      </Text>
    </View>
  );
}
