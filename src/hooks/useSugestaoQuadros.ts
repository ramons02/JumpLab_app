import {
  adicionarOuvinteProgresso,
  analisarQuadros,
  cancelarAnalise,
  totalDeQuadrosDoArquivo,
} from 'deteccao-pose';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import type { NumeroTentativa, PernaTentativa, SugestaoQuadros } from '@/types/attempt';
import { PROTOCOLOS } from '@/utils/protocolos';
import { fpsDeNavegacao } from '@/utils/quadros';
import {
  alturasDosPes,
  janelasDeRefino,
  MOTIVO_VIDEO_ILEGIVEL,
  quadrosDaPassadaGrossa,
  sugerirQuadrosPelosPes,
} from '@/utils/sugestaoQuadros';
import { definirSugestao } from '@/utils/tentativas';

/** Parte da barra de progresso que cabe à passada grossa; o resto é do refino. */
const PESO_PASSADA_GROSSA = 0.85;

interface AnaliseEmCurso {
  id: string;
  perna: PernaTentativa;
  indice: number;
  uri: string;
}

let proximaAnalise = 1;

/**
 * Sugestão automática da tentativa (spec 018): pede ao módulo nativo os pontos dos pés na passada
 * grossa e nas janelas de refino, aplica a regra e grava o resultado no rascunho. A análise é
 * cancelada ao sair do analisador, ao trocar de tentativa ou de vídeo; resultado de análise que não é
 * mais a atual é ignorado.
 */
export function useSugestaoQuadros(perna: PernaTentativa, numero: NumeroTentativa) {
  const { rascunho, atualizarTentativas } = useRascunhoAvaliacao();
  const indice = numero - 1;
  const tentativa = rascunho?.tentativas[perna]?.[indice];
  const uri = tentativa?.video?.uri ?? null;
  const [progresso, setProgresso] = useState<number | null>(null);
  const emCurso = useRef<AnaliseEmCurso | null>(null);

  // O provedor do rascunho recria a função a cada mudança; a ref evita cancelar a análise por isso.
  const atualizarRef = useRef(atualizarTentativas);
  useEffect(() => {
    atualizarRef.current = atualizarTentativas;
  }, [atualizarTentativas]);

  /** Troca a sugestão da tentativa da análise, só se ela ainda tem o mesmo vídeo. */
  const gravar = useCallback(
    (analise: AnaliseEmCurso, mudar: (atual: SugestaoQuadros | null) => SugestaoQuadros | null) =>
      atualizarRef.current((todas) => ({
        ...todas,
        [analise.perna]: todas[analise.perna]?.map((t, i) =>
          i === analise.indice && t.video?.uri === analise.uri
            ? definirSugestao(t, mudar(t.sugestao))
            : t,
        ),
      })),
    [],
  );

  useEffect(
    () => () => {
      const analise = emCurso.current;
      if (!analise) return;
      emCurso.current = null;
      cancelarAnalise(analise.id);
      gravar(analise, (s) => (s?.estado === 'analisando' ? null : s));
      setProgresso(null);
    },
    [perna, indice, uri, gravar],
  );

  const video = tentativa?.video ?? null;
  const fpsConfirmado = tentativa?.fpsConfirmado ?? null;
  const protocolo = rascunho?.protocolo;

  const sugerir = useCallback(async () => {
    if (!video || fpsConfirmado === null || !protocolo || emCurso.current) return;
    const fpsArquivo = fpsDeNavegacao(video, fpsConfirmado) ?? fpsConfirmado;
    const analise: AnaliseEmCurso = {
      id: `${perna}-${numero}-${proximaAnalise++}`,
      perna,
      indice,
      uri: video.uri,
    };
    const valendo = () => emCurso.current === analise;
    emCurso.current = analise;
    gravar(analise, () => ({ estado: 'analisando', uri: analise.uri }));
    setProgresso(0);

    let inicioDaFase = 0;
    let pesoDaFase = PESO_PASSADA_GROSSA;
    const ouvinte = adicionarOuvinteProgresso(({ idAnalise, fracao }) => {
      if (idAnalise === analise.id && valendo()) setProgresso(inicioDaFase + fracao * pesoDaFase);
    });

    try {
      const total = await totalDeQuadrosDoArquivo(analise.uri);
      if (!valendo()) return;
      const grossa = alturasDosPes(
        await analisarQuadros(
          analise.id,
          analise.uri,
          fpsArquivo,
          quadrosDaPassadaGrossa(total, fpsConfirmado),
        ),
        perna,
      );
      if (!valendo()) return;
      const refino = janelasDeRefino(grossa, total);
      inicioDaFase = PESO_PASSADA_GROSSA;
      pesoDaFase = 1 - PESO_PASSADA_GROSSA;
      const fina =
        refino.length > 0
          ? alturasDosPes(await analisarQuadros(analise.id, analise.uri, fpsArquivo, refino), perna)
          : [];
      if (!valendo()) return;
      const resultado = sugerirQuadrosPelosPes(
        [...grossa, ...fina],
        PROTOCOLOS[protocolo].dropJump,
      );
      gravar(analise, () =>
        resultado.tipo === 'pronta'
          ? { estado: 'pronta', uri: analise.uri, quadros: resultado.quadros }
          : { estado: 'falhou', uri: analise.uri, motivo: resultado.motivo },
      );
    } catch {
      if (valendo()) {
        gravar(analise, () => ({
          estado: 'falhou',
          uri: analise.uri,
          motivo: MOTIVO_VIDEO_ILEGIVEL,
        }));
      }
    } finally {
      ouvinte.remove();
      if (valendo()) {
        emCurso.current = null;
        setProgresso(null);
      }
    }
  }, [video, fpsConfirmado, protocolo, perna, numero, indice, gravar]);

  return { sugestao: tentativa?.sugestao ?? null, progresso, sugerir };
}
