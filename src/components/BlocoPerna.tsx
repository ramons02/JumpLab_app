import { Text, View } from 'react-native';

import { CartaoMedida } from '@/components/CartaoMedida';
import type { MedidasSalto, ResumoPerna } from '@/types/resultadoSalto';
import {
  CASAS_ALTURA,
  CASAS_MARGEM,
  CASAS_RSI,
  CASAS_TEMPO_MS,
  formatarDecimal,
} from '@/utils/formatacao';

interface BlocoPernaProps {
  titulo?: string;
  resumo: ResumoPerna;
  dropJump: boolean;
  destaque?: boolean;
}

const formatar = (valor: number | null, casas: number) =>
  valor === null ? '-' : formatarDecimal(valor, casas);

function porTentativa(
  tentativas: MedidasSalto[],
  campo: keyof MedidasSalto,
  casas: number,
  unidade = '',
) {
  return tentativas.map((t) => `${formatar(t[campo], casas)}${unidade}`);
}

/** Médias de uma perna (ou da perna única), com cada tentativa abaixo da média. */
export function BlocoPerna({ titulo, resumo, dropJump, destaque = false }: BlocoPernaProps) {
  const { tentativas } = resumo;
  return (
    <View
      className={`gap-2 rounded-2xl border p-3 ${destaque ? 'border-destaque' : 'border-borda'}`}
    >
      {titulo ? <Text className="text-sm font-semibold text-texto">{titulo}</Text> : null}
      <Text className="text-xs uppercase text-textoSecundario">
        Média de {tentativas.length} tentativas
      </Text>
      <View className="flex-row gap-2">
        <CartaoMedida
          rotulo="Altura"
          valor={formatar(resumo.alturaCm, CASAS_ALTURA)}
          unidade="cm"
          rodape={`margem ±${formatar(resumo.margemCm, CASAS_MARGEM)} cm`}
          tentativas={porTentativa(tentativas, 'alturaCm', CASAS_ALTURA, ' cm')}
        />
        <CartaoMedida
          rotulo="Tempo de voo"
          valor={formatar(resumo.tempoVooMs, CASAS_TEMPO_MS)}
          unidade="ms"
          tentativas={porTentativa(tentativas, 'tempoVooMs', CASAS_TEMPO_MS, ' ms')}
        />
      </View>
      {dropJump ? (
        <View className="flex-row gap-2">
          <CartaoMedida
            rotulo="Tempo de contato"
            valor={formatar(resumo.tempoContatoMs, CASAS_TEMPO_MS)}
            unidade="ms"
            tentativas={porTentativa(tentativas, 'tempoContatoMs', CASAS_TEMPO_MS, ' ms')}
          />
          <CartaoMedida
            rotulo="RSI"
            valor={formatar(resumo.rsi, CASAS_RSI)}
            tentativas={porTentativa(tentativas, 'rsi', CASAS_RSI)}
          />
        </View>
      ) : null}
    </View>
  );
}
