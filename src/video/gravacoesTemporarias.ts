import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

/** Pasta das gravações dentro do cache do app; só gravações ficam aqui (research R4). */
const PASTA_GRAVACOES = 'gravacoes';
const EXTENSAO = '.mp4';

function pastaGravacoes(): Directory {
  return new Directory(Paths.cache, PASTA_GRAVACOES);
}

/** A câmera entrega caminho de sistema de arquivos; o expo-file-system usa `file://`. */
export function paraUriDeArquivo(caminho: string): string {
  return caminho.startsWith('file://') ? caminho : `file://${caminho}`;
}

/**
 * Move a gravação para `cache/gravacoes/` com nome único e devolve a nova URI. O arquivo nunca vai
 * para a galeria (D14).
 */
export async function guardarGravacao(uriOrigem: string): Promise<string> {
  const pasta = pastaGravacoes();
  if (!pasta.exists) pasta.create({ intermediates: true, idempotent: true });
  const arquivo = new File(paraUriDeArquivo(uriOrigem));
  arquivo.move(new File(pasta, `${randomUUID()}${EXTENSAO}`));
  return arquivo.uri;
}

/** Apaga as sobras de uma execução interrompida; chamada só na abertura do app. */
export async function apagarGravacoesOrfas(): Promise<void> {
  const pasta = pastaGravacoes();
  if (pasta.exists) pasta.delete();
}

/** Apaga um arquivo de gravação cancelada, se ele chegou a existir. */
export function apagarArquivoDeGravacao(caminho: string): void {
  try {
    const arquivo = new File(paraUriDeArquivo(caminho));
    if (arquivo.exists) arquivo.delete();
  } catch {
    // O arquivo pode nem ter sido criado; não há o que apagar.
  }
}
