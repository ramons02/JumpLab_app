import { Text, View } from 'react-native';
import { Circle, Ellipse, G, Path, Svg, Text as TextoSvg } from 'react-native-svg';

import cores from '@/theme/cores';
import type { EstadoMapa, GrupoMuscular, GruposConsolidados } from '@/types/melhoria';
import type { Protocol } from '@/types/protocol';
import {
  CONTORNO_PERNA,
  CONTORNO_QUADRIL,
  DETALHES_COSTAS,
  DETALHES_FRENTE,
  ladoDoDesenho as ladoDe,
  MARCADOR,
  MUSCULOS_COSTAS,
  MUSCULOS_FRENTE,
  TOPO_MAPA as TOPO,
} from '@/utils/desenhoMapa';
import { estadoDoGrupo, estadoDoLocal, gruposAvaliados, LOCAIS_MAPA } from '@/utils/melhorias';

const COR = cores.mapa;

interface VistaProps {
  cx: number;
  frente: boolean;
  grupos: GruposConsolidados;
  avaliados: GrupoMuscular[];
}

function Vista({ cx, frente, grupos, avaliados }: VistaProps) {
  const musculos = frente ? MUSCULOS_FRENTE : MUSCULOS_COSTAS;
  return (
    <G>
      {[-1, 1].map((sinal) => {
        const lado = ladoDe(sinal, frente);
        return (
          <G key={sinal} transform={`translate(${cx} ${TOPO}) scale(${sinal} 1)`}>
            <Path d={CONTORNO_QUADRIL} fill={COR.corpo} />
            <Path d={CONTORNO_PERNA} fill={COR.corpo} stroke={COR.contorno} strokeWidth={0.8} />
            {(frente ? DETALHES_FRENTE : DETALHES_COSTAS).map((d) => (
              <Path
                key={d}
                d={d}
                fill={COR.neutro.fundo}
                stroke={COR.neutro.fibra}
                strokeWidth={0.6}
              />
            ))}
            {frente ? (
              <Ellipse
                cx={20}
                cy={130}
                rx={6}
                ry={5}
                fill="none"
                stroke={COR.contorno}
                strokeWidth={0.8}
              />
            ) : null}
            {musculos.map((m) => {
              const estado = estadoDoGrupo(grupos, avaliados, m.grupo, lado);
              return (
                <G key={m.grupo} testID={`musculo-${m.grupo}-${lado}-${estado}`}>
                  <Path
                    d={m.d}
                    fill={COR[estado].fundo}
                    stroke={COR[estado].fibra}
                    strokeWidth={0.7}
                  />
                  {m.fibras.map((f) => (
                    <Path
                      key={f}
                      d={f}
                      fill="none"
                      stroke={COR[estado].fibra}
                      strokeWidth={0.7}
                      opacity={0.7}
                    />
                  ))}
                </G>
              );
            })}
          </G>
        );
      })}
      {[-1, 1].flatMap((sinal) =>
        LOCAIS_MAPA.map((local) => {
          const lado = ladoDe(sinal, frente);
          if (estadoDoLocal(grupos, avaliados, local, lado) === 'neutro') return null;
          const x = cx + sinal * MARCADOR[local.id].x;
          const y = TOPO + MARCADOR[local.id].y;
          return (
            <G key={`${local.id}${sinal}`} testID={`marcador-local-${local.numero[lado]}`}>
              <Circle cx={x} cy={y} r={8} fill={COR.marcador} />
              <TextoSvg
                x={x}
                y={y + 3.5}
                fontSize={10}
                fontWeight="700"
                textAnchor="middle"
                fill={COR.numero}
              >
                {String(local.numero[lado])}
              </TextoSvg>
            </G>
          );
        }),
      )}
      <TextoSvg x={cx} y={276} fontSize={9} textAnchor="middle" fill={COR.texto}>
        {frente ? 'Frente' : 'Costas'}
      </TextoSvg>
    </G>
  );
}

const LEGENDA: { estado: EstadoMapa; texto: string }[] = [
  { estado: 'melhorar', texto: 'melhorar' },
  { estado: 'ok', texto: 'ok' },
  { estado: 'neutro', texto: 'não avaliado' },
];

/**
 * Mapa muscular das pernas, de frente e de costas, no estilo de laudo de dinamometria: vermelho =
 * melhorar, verde = avaliado e bem, cinza = não avaliado; locais numerados (ímpar = perna direita).
 */
export function MapaMuscular({
  grupos,
  protocolo,
}: {
  grupos: GruposConsolidados;
  protocolo: Protocol;
}) {
  const avaliados = gruposAvaliados(protocolo);
  return (
    <View className="items-center gap-1">
      <Svg
        viewBox="0 0 320 282"
        width="100%"
        height={260}
        accessibilityLabel="Mapa muscular das pernas, de frente e de costas"
      >
        <Vista cx={80} frente grupos={grupos} avaliados={avaliados} />
        <Vista cx={240} frente={false} grupos={grupos} avaliados={avaliados} />
      </Svg>
      <View className="flex-row gap-4">
        {LEGENDA.map(({ estado, texto }) => (
          <View key={estado} className="flex-row items-center gap-1">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: COR[estado].fundo }} />
            <Text className="text-[10px] text-textoSecundario">{texto}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
