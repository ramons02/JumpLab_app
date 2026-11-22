import { View } from 'react-native';

import { BlocoPerna } from '@/components/BlocoPerna';
import { CartaoLsi } from '@/components/CartaoLsi';
import { SeloBaixaPrecisao } from '@/components/SeloBaixaPrecisao';
import type { ResumoSalto } from '@/types/assessment';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import { PROTOCOLOS } from '@/utils/protocolos';
import { ROTULO_PERNA } from '@/utils/rotulos';

interface BlocoSaltoProps {
  protocolo: Protocol;
  pernaLesionada: PernaLesionada;
  resumo: ResumoSalto;
}

/** Resultado de um salto: selo de baixa precisão, LSI (unilaterais) e os blocos por perna. */
export function BlocoSalto({ protocolo, pernaLesionada, resumo }: BlocoSaltoProps) {
  const { dropJump, unilateral } = PROTOCOLOS[protocolo];
  return (
    <View className="gap-3">
      {resumo.baixaPrecisao ? <SeloBaixaPrecisao /> : null}
      {resumo.lsi ? <CartaoLsi lsi={resumo.lsi} pernaLesionada={pernaLesionada} /> : null}
      {unilateral ? (
        (['direita', 'esquerda'] as const).map((perna) => {
          const medidas = resumo.pernas[perna];
          if (!medidas) return null;
          const lesionada = pernaLesionada === perna;
          return (
            <BlocoPerna
              key={perna}
              titulo={`Perna ${ROTULO_PERNA[perna].toLowerCase()}${lesionada ? ' (lesionada)' : ''}`}
              resumo={medidas}
              dropJump={dropJump}
              destaque={lesionada}
            />
          );
        })
      ) : resumo.pernas.unica ? (
        <BlocoPerna resumo={resumo.pernas.unica} dropJump={dropJump} />
      ) : null}
    </View>
  );
}
