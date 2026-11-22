import { Pressable, Text, View } from 'react-native';

import type { MarcacaoAgachamento } from '@/hooks/useMarcacaoAgachamento';
import type { EventoRepeticao } from '@/types/squat';
import {
  CASAS_AMPLITUDE,
  CASAS_PERDA,
  CASAS_PX_POR_CM,
  CASAS_TEMPO_AGACH_S,
  CASAS_VELOCIDADE,
  formatarDecimal,
} from '@/utils/formatacao';

const EVENTOS: { evento: EventoRepeticao; rotulo: string }[] = [
  { evento: 'inicio', rotulo: 'Início da descida' },
  { evento: 'fundo', rotulo: 'Fundo' },
  { evento: 'fim', rotulo: 'Fim da subida' },
];

function Botao({
  rotulo,
  descricao,
  habilitado,
  armado = false,
  onPress,
}: {
  rotulo: string;
  descricao?: string;
  habilitado: boolean;
  armado?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={descricao ?? rotulo}
      disabled={!habilitado}
      onPress={onPress}
      className={`flex-1 items-center rounded-xl border px-2 py-3 ${
        armado ? 'border-aviso bg-aviso-fundo' : 'border-borda bg-cartao'
      } ${habilitado ? '' : 'opacity-40'}`}
    >
      <Text className="text-center text-xs font-semibold text-texto">{rotulo}</Text>
    </Pressable>
  );
}

interface PainelAgachamentoProps {
  marcacao: MarcacaoAgachamento;
  fpsConfirmado: boolean;
}

/** "1. Calibração pelo disco", "2. Repetições", `+ Repetição` e a prévia da série. */
export function PainelAgachamento({ marcacao, fpsConfirmado }: PainelAgachamentoProps) {
  const { serie, armado, previa } = marcacao;
  const armadoEm = (repeticao: number, evento: EventoRepeticao) =>
    typeof armado === 'object' &&
    armado !== null &&
    armado.repeticao === repeticao &&
    armado.evento === evento;

  return (
    <View className="gap-4">
      <View className="gap-2 rounded-2xl border border-borda bg-cartao p-4">
        <Text className="text-sm font-semibold text-texto">1. Calibração pelo disco</Text>
        <Text className="text-xs text-textoSecundario">
          {marcacao.pixelsPorCm === null
            ? 'Toque no topo e na base do disco (45 cm).'
            : `Escala: ${formatarDecimal(marcacao.pixelsPorCm, CASAS_PX_POR_CM)} px/cm`}
        </Text>
        <Botao
          rotulo={marcacao.calibrado ? 'Refazer calibração' : 'Calibrar'}
          habilitado={fpsConfirmado}
          armado={armado === 'topo' || armado === 'base'}
          onPress={() => marcacao.armar('topo')}
        />
      </View>

      <View className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
        <Text className="text-sm font-semibold text-texto">2. Repetições</Text>
        {serie.repeticoes.map((repeticao, indice) => (
          <View key={indice} className="gap-1">
            <Text className="text-xs text-textoSecundario">Repetição {indice + 1}</Text>
            <View className="flex-row gap-2">
              {EVENTOS.map(({ evento, rotulo }) => {
                const marca = repeticao[evento];
                return (
                  <Botao
                    key={evento}
                    rotulo={marca ? `${rotulo} · ${marca.quadro}` : rotulo}
                    descricao={`${rotulo} da repetição ${indice + 1}`}
                    habilitado={marcacao.calibrado}
                    armado={armadoEm(indice, evento)}
                    onPress={() => marcacao.armar({ repeticao: indice, evento })}
                  />
                );
              })}
            </View>
          </View>
        ))}
        <Botao
          rotulo="+ Repetição"
          habilitado={marcacao.podeAdicionar}
          onPress={marcacao.adicionarRepeticao}
        />
      </View>

      {marcacao.mensagem ? (
        <Text accessibilityRole="alert" className="text-xs text-erro">
          {marcacao.mensagem}
        </Text>
      ) : null}

      {previa ? (
        <View testID="previa-agachamento" className="gap-1 rounded-2xl border border-borda p-4">
          <Text className="text-sm font-semibold text-texto">Prévia</Text>
          {previa.repeticoes.map((r) => (
            <Text key={r.numero} className="text-xs text-texto">
              Rep {r.numero}: {formatarDecimal(r.velocidadeMs, CASAS_VELOCIDADE)} m/s ·{' '}
              {formatarDecimal(r.amplitudeCm, CASAS_AMPLITUDE)} cm · subida{' '}
              {formatarDecimal(r.subidaS, CASAS_TEMPO_AGACH_S)} s
            </Text>
          ))}
          {previa.perdaVelocidadePct !== null ? (
            <Text className="text-xs text-textoSecundario">
              Perda de velocidade: {formatarDecimal(previa.perdaVelocidadePct, CASAS_PERDA)}%
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
