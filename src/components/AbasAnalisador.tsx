import { Pressable, Text, View } from 'react-native';

import type { NumeroTentativa, PernaTentativa } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import { ROTULO_PERNA } from '@/utils/rotulos';
import { TENTATIVAS_POR_PERNA } from '@/utils/tentativas';

const NUMEROS = Array.from({ length: TENTATIVAS_POR_PERNA }, (_, i) => (i + 1) as NumeroTentativa);

interface AbasAnalisadorProps {
  pernas: PernaTentativa[];
  pernaAtiva: PernaTentativa;
  numeroAtivo: NumeroTentativa;
  pernaLesionada: PernaLesionada;
  completa: (perna: PernaTentativa, numero: NumeroTentativa) => boolean;
  aoEscolherPerna: (perna: PernaTentativa) => void;
  aoEscolherNumero: (numero: NumeroTentativa) => void;
}

function Aba({
  rotulo,
  ativa,
  completa,
  aoTocar,
}: {
  rotulo: string;
  ativa: boolean;
  completa: boolean;
  aoTocar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={completa ? `${rotulo}, completa` : rotulo}
      accessibilityState={{ selected: ativa }}
      onPress={aoTocar}
      className={`flex-1 items-center rounded-xl py-2 ${ativa ? 'bg-destaque' : 'bg-cartao'}`}
    >
      <Text className={`text-xs font-semibold ${ativa ? 'text-fundo' : 'text-textoSecundario'}`}>
        {rotulo}
        {completa ? ' ✓' : ''}
      </Text>
    </Pressable>
  );
}

/** Abas de perna (só nos unilaterais) e de tentativa, com a marca de completa (spec 007). */
export function AbasAnalisador({
  pernas,
  pernaAtiva,
  numeroAtivo,
  pernaLesionada,
  completa,
  aoEscolherPerna,
  aoEscolherNumero,
}: AbasAnalisadorProps) {
  const rotuloPerna = (perna: PernaTentativa) =>
    perna === 'unica'
      ? ''
      : `Perna ${ROTULO_PERNA[perna].toLowerCase()}${pernaLesionada === perna ? ' (lesionada)' : ''}`;

  return (
    <View className="gap-2">
      {pernas.length > 1 ? (
        <View accessibilityRole="tablist" className="flex-row gap-2">
          {pernas.map((perna) => (
            <Aba
              key={perna}
              rotulo={rotuloPerna(perna)}
              ativa={perna === pernaAtiva}
              completa={NUMEROS.every((n) => completa(perna, n))}
              aoTocar={() => aoEscolherPerna(perna)}
            />
          ))}
        </View>
      ) : null}
      <View accessibilityRole="tablist" className="flex-row gap-2">
        {NUMEROS.map((numero) => (
          <Aba
            key={numero}
            rotulo={`Tentativa ${numero}`}
            ativa={numero === numeroAtivo}
            completa={completa(pernaAtiva, numero)}
            aoTocar={() => aoEscolherNumero(numero)}
          />
        ))}
      </View>
    </View>
  );
}
