/**
 * Sistema de arquivos em memória para o `expo-file-system` (API File/Directory). Usar com
 * `jest.mock('expo-file-system', () => require('../helpers/mockSistemaArquivos').moduloFalso)`.
 */
export const arquivosFalsos = new Set<string>();
export const pastasFalsas = new Set<string>();

const CACHE = 'file:///cache';

function juntar(base: unknown, nome?: string): string {
  const raiz = typeof base === 'string' ? base : (base as { uri: string }).uri;
  return nome ? `${raiz.replace(/\/$/, '')}/${nome}` : raiz;
}

class FileFalso {
  uri: string;
  constructor(base: unknown, nome?: string) {
    this.uri = juntar(base, nome);
  }
  get exists() {
    return arquivosFalsos.has(this.uri);
  }
  move(destino: { uri: string }) {
    if (!arquivosFalsos.has(this.uri)) throw new Error(`não existe: ${this.uri}`);
    arquivosFalsos.delete(this.uri);
    arquivosFalsos.add(destino.uri);
    this.uri = destino.uri;
  }
  delete() {
    if (!arquivosFalsos.delete(this.uri)) throw new Error(`não existe: ${this.uri}`);
  }
}

class DirectoryFalso {
  uri: string;
  constructor(base: unknown, nome?: string) {
    this.uri = juntar(base, nome);
  }
  get exists() {
    return pastasFalsas.has(this.uri);
  }
  create() {
    pastasFalsas.add(this.uri);
  }
  delete() {
    if (!pastasFalsas.delete(this.uri)) throw new Error(`não existe: ${this.uri}`);
    for (const arquivo of [...arquivosFalsos]) {
      if (arquivo.startsWith(`${this.uri}/`)) arquivosFalsos.delete(arquivo);
    }
  }
}

export const moduloFalso = {
  File: FileFalso,
  Directory: DirectoryFalso,
  Paths: { cache: { uri: CACHE } },
};

export function limparSistemaArquivos() {
  arquivosFalsos.clear();
  pastasFalsas.clear();
}
