import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { BotoesMarcacao } from '@/components/BotoesMarcacao';
import { PassoGuiado } from '@/components/PassoGuiado';
import { PreviaTentativa } from '@/components/PreviaTentativa';
import type {
  EventoSalto,
  NumeroTentativa,
  PernaTentativa,
  TentativaEmAndamento,
} from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { medirTentativa } from '@/utils/biomechanics';
import { proximoEvento } from '@/utils/marcacoes';
import { PROTOCOLOS } from '@/utils/protocolos';
import { marcacoesLiberadas, paraAttempt } from '@/utils/tentativas';

interface PainelMarcacaoProps {
  protocolo: Protocol;
  perna: PernaTentativa;
  numero: NumeroTentativa;
  tentativa: TentativaEmAndamento;
  recusa: string | null;
  aoMarcar: (evento: EventoSalto) => void;
  /** Leva o vídeo ao quadro de um evento marcado (D23). */
  aoIrAoQuadro: (quadro: number) => void;
}

/** Botões de marcação, recusa fora de ordem e prévia da tentativa completa (spec 007). */
export function PainelMarcacao({
  protocolo,
  perna,
  numero,
  tentativa,
  recusa,
  aoMarcar,
  aoIrAoQuadro,
}: PainelMarcacaoProps) {
  const medida = useMemo(() => {
    const concluida = paraAttempt(tentativa, perna, numero, protocolo);
    return concluida ? medirTentativa(concluida, PROTOCOLOS[protocolo].dropJump) : null;
  }, [tentativa, perna, numero, protocolo]);

  const liberadas = marcacoesLiberadas(tentativa);
  const proximo = proximoEvento(tentativa.marcas, protocolo);

  return (
    <View className="gap-3">
      {proximo && liberadas ? <PassoGuiado protocolo={protocolo} evento={proximo} /> : null}
      <BotoesMarcacao
        protocolo={protocolo}
        marcas={tentativa.marcas}
        liberadas={liberadas}
        aoMarcar={aoMarcar}
        proximo={proximo}
        aoIrAoQuadro={aoIrAoQuadro}
        quadrosSugeridos={
          tentativa.sugestao?.estado === 'pronta' ? tentativa.sugestao.quadros : undefined
        }
      />
      {recusa ? (
        <Text accessibilityRole="alert" className="rounded-xl bg-erro-fundo p-3 text-xs text-erro">
          {recusa}
        </Text>
      ) : null}
      {medida ? <PreviaTentativa medida={medida} numero={numero} perna={perna} /> : null}
      {proximo === null ? (
        <Text className="text-center text-xs text-textoSecundario">
          Para corrigir: vá ao quadro certo e toque no evento.
        </Text>
      ) : null}
    </View>
  );
}
