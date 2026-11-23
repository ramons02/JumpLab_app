import { useCallback, useEffect, useState } from 'react';

import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import type { EventoRepeticao, ResultadoAgachamento, SquatSeries } from '@/types/squat';
import { medirAgachamento, pixelsPorCm as escalaDoDisco } from '@/utils/biomechanics';
import { pendenciasDoAgachamento } from '@/utils/pendencias';
import {
  aplicarMarca,
  paraSerie,
  podeAdicionarRepeticao,
  repeticaoVazia,
  serieVazia,
  validarCalibracao,
  validarMarca,
} from '@/utils/marcacaoAgachamento';

function medirPrevia(
  serie: SquatSeries | null,
  cargaKg: number | null,
): ResultadoAgachamento | null {
  if (!serie || !cargaKg) return null;
  try {
    return medirAgachamento(serie, cargaKg);
  } catch {
    return null;
  }
}

export type AlvoMarcacao = 'topo' | 'base' | { repeticao: number; evento: EventoRepeticao };

/**
 * Calibração pelo disco e marcação das repetições sobre o rascunho (bloco `serie`). Cada toque passa
 * pelas regras de marcacaoAgachamento; recusado, mostra a mensagem e não muda nada.
 */
export function useMarcacaoAgachamento(quadroAtual: number) {
  const { rascunho, atualizarSerie } = useRascunhoAvaliacao();
  const tentativa = rascunho?.tentativas.unica?.[0];
  const uriDoVideo = tentativa?.video?.uri ?? null;
  const fpsConfirmado = tentativa?.fpsConfirmado ?? null;
  const serie = rascunho?.serie ?? serieVazia(uriDoVideo);
  // Evento armado e última recusa valem só para o vídeo em que foram feitos.
  const [estado, setEstado] = useState<{
    uri: string | null;
    armado: AlvoMarcacao | null;
    mensagem: string | null;
  }>({ uri: uriDoVideo, armado: null, mensagem: null });
  const doVideo = estado.uri === uriDoVideo;
  const armado = doVideo ? estado.armado : null;
  const mensagem = doVideo ? estado.mensagem : null;
  const setArmado = useCallback(
    (alvo: AlvoMarcacao | null) => setEstado((e) => ({ ...e, uri: uriDoVideo, armado: alvo })),
    [uriDoVideo],
  );
  const setMensagem = useCallback(
    (texto: string | null) => setEstado((e) => ({ ...e, uri: uriDoVideo, mensagem: texto })),
    [uriDoVideo],
  );

  // Vídeo novo (ou trocado): calibração e marcas pertencem ao vídeo anterior e são apagadas.
  useEffect(() => {
    if (rascunho?.serie && rascunho.serie.uriDoVideo !== uriDoVideo) {
      atualizarSerie(() => serieVazia(uriDoVideo));
    }
  }, [rascunho?.serie, uriDoVideo, atualizarSerie]);

  const calibracao = serie.calibracao;
  const calibrado = calibracao !== null && calibracao.baseY !== null;

  const armar = useCallback(
    (alvo: AlvoMarcacao) => {
      setMensagem(null);
      if (alvo === 'topo') atualizarSerie((atual) => ({ ...atual, calibracao: null }));
      setArmado(alvo);
    },
    [atualizarSerie, setArmado, setMensagem],
  );

  const tocarNaImagem = useCallback(
    (yVideo: number) => {
      if (armado === null) return;
      if (armado === 'topo') {
        atualizarSerie((atual) => ({ ...atual, calibracao: { topoY: yVideo, baseY: null } }));
        setArmado('base');
        return;
      }
      if (armado === 'base') {
        const topoY = serie.calibracao?.topoY;
        if (topoY === undefined) return;
        const recusa = validarCalibracao(topoY, yVideo);
        setMensagem(recusa);
        if (recusa) return;
        atualizarSerie((atual) => ({ ...atual, calibracao: { topoY, baseY: yVideo } }));
        setArmado(null);
        return;
      }
      const marca = { quadro: quadroAtual, y: yVideo };
      const recusa = validarMarca(serie.repeticoes, armado.repeticao, armado.evento, marca);
      setMensagem(recusa);
      if (recusa) return;
      atualizarSerie((atual) => ({
        ...atual,
        repeticoes: aplicarMarca(atual.repeticoes, armado.repeticao, armado.evento, marca),
      }));
      setArmado(null);
    },
    [armado, quadroAtual, serie, atualizarSerie, setArmado, setMensagem],
  );

  const adicionarRepeticao = useCallback(() => {
    if (!podeAdicionarRepeticao(serie.repeticoes)) return;
    atualizarSerie((atual) => ({ ...atual, repeticoes: [...atual.repeticoes, repeticaoVazia()] }));
  }, [serie.repeticoes, atualizarSerie]);

  const previa = medirPrevia(paraSerie(fpsConfirmado, serie), rascunho?.cargaKg ?? null);

  return {
    serie,
    armado,
    armar,
    tocarNaImagem,
    adicionarRepeticao,
    podeAdicionar: podeAdicionarRepeticao(serie.repeticoes),
    calibrado,
    pixelsPorCm:
      calibrado && calibracao?.baseY != null
        ? escalaDoDisco({ topoY: calibracao.topoY, baseY: calibracao.baseY })
        : null,
    previa,
    podeVerResultado: previa !== null,
    pendencias: pendenciasDoAgachamento({
      temVideo: uriDoVideo !== null,
      fpsConfirmado,
      cargaKg: rascunho?.cargaKg ?? null,
      serie,
    }),
    mensagem,
  };
}

export type MarcacaoAgachamento = ReturnType<typeof useMarcacaoAgachamento>;
