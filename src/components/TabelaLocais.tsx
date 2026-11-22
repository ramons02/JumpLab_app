import { Text, View } from 'react-native';

import cores from '@/theme/cores';
import type { PontoMelhoria } from '@/types/melhoria';
import { dataHoraParaBr } from '@/utils/datas';
import { CASAS_LSI, formatarDecimal } from '@/utils/formatacao';
import {
  explicacaoDaRazao,
  linhasDaTabela,
  medidaDoLado,
  razaoDoLado,
  ROTULO_GRUPO,
  type AvaliacaoParaMelhorias,
} from '@/utils/melhorias';
import { ROTULO_PERNA } from '@/utils/rotulos';

const NOME_CURTO = {
  cmj_bi: 'CMJ',
  cmj_uni: 'CMJ Uni',
  sj: 'SJ',
  dj: 'DJ',
  dj_uni: 'DJ Uni',
  agach: 'Agach.',
} as const;

function Numero({ valor }: { valor: number }) {
  return (
    <View
      className="h-4 w-4 items-center justify-center rounded-full"
      style={{ backgroundColor: cores.mapa.marcador }}
    >
      <Text className="text-[9px] font-bold" style={{ color: cores.mapa.numero }}>
        {valor}
      </Text>
    </View>
  );
}

interface TabelaLocaisProps {
  pontos: PontoMelhoria[];
  avaliacao: AvaliacaoParaMelhorias & { dataHora: string };
}

/** Local / Teste / Medida / Razão / Desvio, com o motivo de cada "!" e a frase da razão abaixo. */
export function TabelaLocais({ pontos, avaliacao }: TabelaLocaisProps) {
  const linhas = linhasDaTabela(pontos, avaliacao);
  return (
    <View className="gap-1">
      <View className="flex-row border-b border-borda pb-1">
        <Text className="flex-[2.2] text-[10px] font-semibold text-textoSecundario">Local</Text>
        <Text className="flex-1 text-[10px] font-semibold text-textoSecundario">
          Teste {dataHoraParaBr(avaliacao.dataHora)}
        </Text>
        <Text className="flex-1 text-[10px] font-semibold text-textoSecundario">Medida</Text>
        <Text className="flex-1 text-[10px] font-semibold text-textoSecundario">Razão</Text>
        <Text className="w-10 text-center text-[10px] font-semibold text-textoSecundario">
          Desvio
        </Text>
      </View>
      {linhas.map((linha) => {
        const razao = razaoDoLado(avaliacao, linha.lados[0]);
        const melhorar = linha.estado === 'melhorar';
        return (
          <View
            key={`${linha.local.id}-${linha.lado}`}
            testID={`linha-local-${linha.local.id}-${linha.lado}`}
            className="gap-0.5 border-b border-borda py-1"
          >
            <View className="flex-row items-start">
              <View className="flex-[2.2] flex-row gap-1.5">
                <View className="flex-row gap-0.5">
                  {linha.lados.map((l) => (
                    <Numero key={l} valor={linha.local.numero[l]} />
                  ))}
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-medium text-texto">
                    {linha.local.nome}{' '}
                    {linha.lado === 'ambas' ? '(ambas)' : ROTULO_PERNA[linha.lado].toLowerCase()}
                  </Text>
                  <Text className="text-[10px] text-textoSecundario">
                    {linha.grupos
                      .map((g) => ROTULO_GRUPO[g].replace(' (panturrilha)', ''))
                      .join(', ')}
                  </Text>
                </View>
              </View>
              <Text className="flex-1 text-[11px] text-texto">
                {NOME_CURTO[avaliacao.protocolo]}
              </Text>
              <Text className="flex-1 text-[11px] text-texto">
                {medidaDoLado(avaliacao, linha.lados[0])}
              </Text>
              <Text className="flex-1 text-[11px] text-texto">
                {razao === null ? '—' : `${formatarDecimal(razao, CASAS_LSI)}%`}
              </Text>
              <View className="w-10 items-center">
                <View
                  accessibilityLabel={melhorar ? 'Melhorar' : 'Ok'}
                  className="h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: cores.mapa[linha.estado].fundo }}
                >
                  <Text className="text-[10px] font-bold text-texto">{melhorar ? '!' : '✓'}</Text>
                </View>
              </View>
            </View>
            {linha.motivos.length > 0 ? (
              <Text
                className="text-right text-[10px] font-medium"
                style={{ color: cores.mapa.alerta }}
              >
                {linha.motivos.join(' · ')}
              </Text>
            ) : null}
          </View>
        );
      })}
      <Text className="text-[10px] text-textoSecundario">{explicacaoDaRazao(avaliacao)}</Text>
    </View>
  );
}
