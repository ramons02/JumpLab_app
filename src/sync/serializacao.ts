/** Colunas que só existem no aparelho e não sobem para a API. */
const COLUNAS_LOCAIS = new Set(['pendente_sync']);

/** Linha do SQLite como conteúdo enviado: as mesmas colunas, menos as locais. */
export function linhaParaConteudo(linha: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(linha).filter(([coluna]) => !COLUNAS_LOCAIS.has(coluna)),
  );
}

/** D14: nenhum vídeo sobe. Acha chave com "video" ou "uri" no nome, em qualquer nível. */
export function contemChaveDeVideo(valor: unknown): boolean {
  if (Array.isArray(valor)) return valor.some(contemChaveDeVideo);
  if (typeof valor !== 'object' || valor === null) return false;
  return Object.entries(valor).some(([chave, filho]) => {
    const nome = chave.toLowerCase();
    return nome.includes('video') || nome.includes('uri') || contemChaveDeVideo(filho);
  });
}
