import { Text, View } from 'react-native';
import { Circle, Ellipse, G, Path, Svg, Text as TextoSvg } from 'react-native-svg';

import cores from '@/theme/cores';
import type { EstadoMapa, GrupoMuscular, GruposConsolidados, LadoPerna } from '@/types/melhoria';
import type { Protocol } from '@/types/protocol';
import { estadoDoGrupo, estadoDoLocal, gruposAvaliados, LOCAIS_MAPA } from '@/utils/melhorias';

// Traçados do protótipo validado (spec 017): uma perna, com x crescendo para fora do corpo; a outra é
// espelhada. Viewbox 320 x 282, frente centrada em x 80 e costas em x 240.
const CONTORNO_PERNA =
  'M1 30 C1 70 6 105 9 128 C7 150 8 175 13 214 L12 232 C14 240 30 242 30 236 L24 214 C30 182 34 160 31 142 C30 134 31 128 33 122 C40 90 43 50 40 22 Z';
const CONTORNO_QUADRIL = 'M0 -6 L34 -6 C40 8 43 18 41 28 L0 30 Z';

interface Musculo {
  grupo: GrupoMuscular;
  d: string;
  fibras: string[];
}

const MUSCULOS_FRENTE: Musculo[] = [
  {
    grupo: 'quadriceps',
    d: 'M6 36 C4 70 8 100 14 118 C20 123 28 119 32 110 C37 80 38 50 34 30 C24 24 12 26 6 36 Z',
    fibras: [
      'M20 31 C18 66 20 96 22 120',
      'M9 90 C8 104 11 114 16 118',
      'M33 60 C30 80 29 98 30 112',
    ],
  },
];
const MUSCULOS_COSTAS: Musculo[] = [
  { grupo: 'gluteo_medio', d: 'M14 -3 C24 -8 38 -4 40 8 C34 3 22 1 14 -3 Z', fibras: [] },
  {
    grupo: 'gluteo_maximo',
    d: 'M2 6 C14 -1 34 3 39 18 C41 32 34 46 20 47 C8 47 2 40 2 30 Z',
    fibras: ['M6 14 C16 22 26 32 34 40', 'M4 26 C12 32 20 40 26 46'],
  },
  {
    grupo: 'posteriores',
    d: 'M6 52 C4 80 8 105 12 120 C20 126 28 124 32 116 C37 90 38 66 36 50 C26 46 14 46 6 52 Z',
    fibras: ['M21 50 C19 80 20 104 22 124', 'M10 70 C10 90 13 106 16 118'],
  },
  {
    grupo: 'triceps_sural',
    d: 'M11 138 C8 160 12 180 17 194 C22 198 28 192 31 178 C34 160 32 145 28 136 C22 132 15 132 11 138 Z',
    fibras: ['M20 134 C19 156 20 178 20 196'],
  },
];
const DETALHES_FRENTE = ['M22 142 C27 165 26 190 22 210 L18 210 C19 190 19 165 22 142 Z'];
const DETALHES_COSTAS = ['M19 196 L23 196 L22 220 L20 220 Z'];

/** Posição do número de cada local, na mesma escala da perna. */
const MARCADOR: Record<(typeof LOCAIS_MAPA)[number]['id'], { x: number; y: number }> = {
  quadril: { x: 50, y: 4 },
  coxa: { x: 48, y: 86 },
  panturrilha: { x: 44, y: 176 },
};

const COR = cores.mapa;
const TOPO = 16;

/** Frente: a perna direita do paciente aparece à esquerda da figura; costas: à direita. */
function ladoDe(sinal: number, frente: boolean): LadoPerna {
  if (frente) return sinal < 0 ? 'direita' : 'esquerda';
  return sinal < 0 ? 'esquerda' : 'direita';
}

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
