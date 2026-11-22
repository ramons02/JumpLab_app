import { useCallback, useState } from 'react';

import { useRascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import type { NumeroTentativa, PernaTentativa, TentativaEmAndamento } from '@/types/attempt';
import * as regras from '@/utils/tentativas';
import { importarVideoDaGaleria } from '@/video/importarVideo';

export const MENSAGEM_PERMISSAO_NEGADA =
  'O JumpLab precisa do acesso aos vídeos para abrir o salto que você filmou. Permita o acesso e tente de novo.';
export const MENSAGEM_VIDEO_NAO_ABRE = 'Não foi possível abrir este vídeo. Escolha outro.';

const TENTATIVA_VAZIA: TentativaEmAndamento = {
  video: null,
  fpsSelecionado: null,
  fpsConfirmado: null,
  marcas: {},
};

/** A tentativa em uso no analisador e as ações sobre ela, guardadas no rascunho da avaliação. */
export function useTentativaAtual(perna: PernaTentativa, numero: NumeroTentativa) {
  const { rascunho, atualizarTentativas } = useRascunhoAvaliacao();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const indice = numero - 1;
  const tentativa = rascunho?.tentativas[perna]?.[indice] ?? TENTATIVA_VAZIA;

  const alterar = useCallback(
    (mudanca: (atual: TentativaEmAndamento) => TentativaEmAndamento) =>
      atualizarTentativas((todas) => ({
        ...todas,
        [perna]: todas[perna]?.map((t, i) => (i === indice ? mudanca(t) : t)),
      })),
    [atualizarTentativas, perna, indice],
  );

  /** Escolhe (ou troca) o vídeo da tentativa. */
  const escolherVideo = useCallback(async () => {
    const resultado = await importarVideoDaGaleria();
    if (resultado.tipo === 'cancelado') return;
    if (resultado.tipo === 'permissao_negada') return setMensagem(MENSAGEM_PERMISSAO_NEGADA);
    if (resultado.tipo === 'erro') return setMensagem(MENSAGEM_VIDEO_NAO_ABRE);
    setMensagem(null);
    alterar((t) => regras.definirVideo(t, resultado.video));
  }, [alterar]);

  return {
    tentativa,
    mensagem,
    escolherVideo,
    selecionarFps: (fps: number) => alterar((t) => regras.selecionarFps(t, fps)),
    confirmarFps: () => alterar(regras.confirmarFps),
    trocarFps: () => alterar(regras.trocarFps),
  };
}
