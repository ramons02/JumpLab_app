import { Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { createVideoPlayer, type VideoPlayer } from 'expo-video';
import { lerDadosDoVideo } from 'leitura-video';

import type { VideoSelecionado } from '@/types/attempt';
import { normalizarFpsLido, taxaDeGravacao, taxaDoArquivo, type LeituraDaTaxa } from '@/utils/fps';

export type ResultadoImportacao =
  | { tipo: 'ok'; video: VideoSelecionado }
  | { tipo: 'cancelado' }
  | { tipo: 'permissao_negada' }
  | { tipo: 'erro' };

/** Tempo máximo para o tocador carregar o arquivo e informar a faixa de vídeo. */
const LIMITE_LEITURA_MS = 5000;
const NOME_PADRAO = 'video.mp4';

function aguardarCarga(player: VideoPlayer): Promise<number | null> {
  return new Promise((resolver) => {
    const limite = setTimeout(() => terminar(null), LIMITE_LEITURA_MS);
    const assinaturas = [
      player.addListener('sourceLoad', ({ availableVideoTracks }) =>
        terminar(availableVideoTracks[0]?.frameRate ?? null),
      ),
      player.addListener('statusChange', ({ status }) => {
        if (status === 'error') terminar(null);
      }),
    ];
    function terminar(taxa: number | null) {
      clearTimeout(limite);
      assinaturas.forEach((assinatura) => assinatura.remove());
      resolver(taxa);
    }
  });
}

/**
 * Taxa da faixa de vídeo (quadros por segundo gravados no arquivo), lida por um tocador do expo-video
 * criado só para isso e liberado ao final (research R2). Sem leitura, null.
 */
export async function lerTaxaDoVideo(uri: string): Promise<number | null> {
  const player = createVideoPlayer({ uri });
  try {
    return normalizarFpsLido(await aguardarCarga(player));
  } finally {
    player.release();
  }
}

/** Taxas lidas do arquivo: a real (para as contas) e a dos quadros no arquivo (para navegar). */
export interface TaxasDoVideo {
  fpsLido: number | null;
  fpsDoArquivo: number | null;
}

/**
 * Lê a taxa de gravação nos dados do arquivo (D22): taxa de captura e contagem de quadros pelo módulo
 * nativo; o que faltar, completa com a taxa que o tocador informa. Falhas viram null, nunca erro.
 */
export async function lerTaxasDoVideo(uri: string): Promise<TaxasDoVideo> {
  const dados = await lerDadosDoVideo(uri).catch(() => null);
  const leitura: LeituraDaTaxa = {
    taxaDeCaptura: dados?.taxaDeCaptura ?? null,
    quadros: dados?.quadros ?? null,
    duracaoS: dados?.duracaoS ?? null,
    taxaDaFaixa: dados?.taxaDaFaixa ?? null,
  };
  if (taxaDoArquivo(leitura) === null) leitura.taxaDaFaixa = await lerTaxaDoVideo(uri);
  return { fpsLido: taxaDeGravacao(leitura), fpsDoArquivo: taxaDoArquivo(leitura) };
}

/** Cópia criada pelo picker no cache do app: precisa ser apagada ao fim da avaliação (D14). */
function ehCopiaNoCache(uri: string): boolean {
  return uri.startsWith(Paths.cache.uri);
}

/** Pede a permissão, abre a galeria só com vídeos e monta o vídeo da tentativa com o FPS lido (D22). */
export async function importarVideoDaGaleria(): Promise<ResultadoImportacao> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) return { tipo: 'permissao_negada' };

  try {
    const escolha = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      // Sem recompressão: recomprimir mudaria a taxa de quadros.
      videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    });
    if (escolha.canceled) return { tipo: 'cancelado' };

    const arquivo = escolha.assets[0];
    const taxas = await lerTaxasDoVideo(arquivo.uri);
    return {
      tipo: 'ok',
      video: {
        uri: arquivo.uri,
        nome: arquivo.fileName ?? NOME_PADRAO,
        duracaoS: (arquivo.duration ?? 0) / 1000,
        fpsLido: taxas.fpsLido,
        fpsDoArquivo: taxas.fpsDoArquivo,
        temporario: ehCopiaNoCache(arquivo.uri),
      },
    };
  } catch {
    return { tipo: 'erro' };
  }
}
