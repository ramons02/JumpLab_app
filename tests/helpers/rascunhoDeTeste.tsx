import { useEffect, useRef } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import type { Attempt, TentativasPorPerna } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';

/** Converte tentativas concluídas no formato em andamento do rascunho (vídeo, FPS e marcas). */
export function tentativasEmAndamento(tentativas: Attempt[]): TentativasPorPerna {
  const porPerna: TentativasPorPerna = {};
  for (const t of [...tentativas].sort((a, b) => a.numero - b.numero)) {
    porPerna[t.perna] = [
      ...(porPerna[t.perna] ?? []),
      {
        video: {
          uri: `file:///cache/${t.perna}-${t.numero}.mp4`,
          nome: `${t.perna}-${t.numero}.mp4`,
          duracaoS: 5,
          fpsLido: t.fps,
          fpsDoArquivo: t.fps,
          temporario: true,
        },
        fpsSelecionado: t.fps,
        fpsConfirmado: t.fps,
        marcas: {
          ...(t.quadroToque === null ? {} : { toque: t.quadroToque }),
          decolagem: t.quadroDecolagem,
          aterrissagem: t.quadroAterrissagem,
        },
      },
    ];
  }
  return porPerna;
}

interface RascunhoProntoProps {
  pacienteId: string;
  protocolo: Protocol;
  pernaLesionada: PernaLesionada;
  tentativas: Attempt[];
}

/** Analisador simulado: grava um rascunho com as tentativas concluídas e segue para o resultado. */
export function RascunhoPronto({
  pacienteId,
  protocolo,
  pernaLesionada,
  tentativas,
}: RascunhoProntoProps) {
  const { rascunho, iniciarRascunho, atualizarTentativas } = useRascunhoAvaliacao();
  const router = useRouter();
  const gravado = useRef(false);
  useEffect(() => {
    if (gravado.current) return;
    gravado.current = true;
    iniciarRascunho({
      pacienteId,
      protocolo,
      cargaKg: null,
      dataHora: '2026-11-22T10:30',
      pernaLesionada,
    });
    atualizarTentativas(() => tentativasEmAndamento(tentativas));
  }, [iniciarRascunho, atualizarTentativas, pacienteId, protocolo, pernaLesionada, tentativas]);
  return (
    <>
      <Text>Analisador</Text>
      {rascunho ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/assessment/result')}>
          <Text>Ver resultado</Text>
        </Pressable>
      ) : null}
    </>
  );
}
