import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { BotoesMarcacao } from '@/components/BotoesMarcacao';
import { PreviaTentativa } from '@/components/PreviaTentativa';
import type {
  EventoSalto,
  NumeroTentativa,
  PernaTentativa,
  TentativaEmAndamento,
} from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { medirTentativa } from '@/utils/biomechanics';
import { PROTOCOLOS } from '@/utils/protocolos';
import { marcacoesLiberadas, paraAttempt } from '@/utils/tentativas';

interface PainelMarcacaoProps {
  protocolo: Protocol;
  perna: PernaTentativa;
  numero: NumeroTentativa;
  tentativa: TentativaEmAndamento;
  recusa: string | null;
  aoMarcar: (evento: EventoSalto) => void;
}

/** Botões de marcação, recusa fora de ordem e prévia da tentativa completa (spec 007). */
export function PainelMarcacao({
  protocolo,
  perna,
  numero,
  tentativa,
  recusa,
  aoMarcar,
}: PainelMarcacaoProps) {
  const medida = useMemo(() => {
    const concluida = paraAttempt(tentativa, perna, numero, protocolo);
    return concluida ? medirTentativa(concluida, PROTOCOLOS[protocolo].dropJump) : null;
  }, [tentativa, perna, numero, protocolo]);

  return (
    <View className="gap-3">
      <BotoesMarcacao
        protocolo={protocolo}
        marcas={tentativa.marcas}
        liberadas={marcacoesLiberadas(tentativa)}
        aoMarcar={aoMarcar}
      />
      {recusa ? (
        <Text accessibilityRole="alert" className="rounded-xl bg-erro-fundo p-3 text-xs text-erro">
          {recusa}
        </Text>
      ) : null}
      {medida ? <PreviaTentativa medida={medida} numero={numero} perna={perna} /> : null}
    </View>
  );
}
