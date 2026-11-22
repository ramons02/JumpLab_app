import {
  arquivosFalsos,
  limparSistemaArquivos,
  pastasFalsas,
} from '../helpers/mockSistemaArquivos';

import {
  apagarArquivoDeGravacao,
  apagarGravacoesOrfas,
  guardarGravacao,
  paraUriDeArquivo,
} from '@/video/gravacoesTemporarias';

jest.mock(
  'expo-file-system',
  () => jest.requireActual('../helpers/mockSistemaArquivos').moduloFalso,
);

const PASTA = 'file:///cache/gravacoes';

describe('gravações temporárias', () => {
  beforeEach(limparSistemaArquivos);

  it('move para cache/gravacoes/ com nome único, criando a pasta', async () => {
    arquivosFalsos.add('file:///data/camera/VID_1.mp4');
    arquivosFalsos.add('file:///data/camera/VID_2.mp4');

    const primeira = await guardarGravacao('/data/camera/VID_1.mp4');
    const segunda = await guardarGravacao('file:///data/camera/VID_2.mp4');

    expect(pastasFalsas.has(PASTA)).toBe(true);
    expect(primeira.startsWith(`${PASTA}/`)).toBe(true);
    expect(primeira.endsWith('.mp4')).toBe(true);
    expect(segunda).not.toBe(primeira);
    expect([...arquivosFalsos].sort()).toEqual([primeira, segunda].sort());
  });

  it('a limpeza apaga a pasta inteira', async () => {
    arquivosFalsos.add('file:///data/camera/VID_1.mp4');
    const guardada = await guardarGravacao('/data/camera/VID_1.mp4');
    arquivosFalsos.add('file:///cache/outro.txt');

    await apagarGravacoesOrfas();

    expect(pastasFalsas.has(PASTA)).toBe(false);
    expect(arquivosFalsos.has(guardada)).toBe(false);
    expect(arquivosFalsos.has('file:///cache/outro.txt')).toBe(true);
  });

  it('a limpeza não falha sem a pasta', async () => {
    await expect(apagarGravacoesOrfas()).resolves.toBeUndefined();
  });

  it('apaga o arquivo de uma gravação cancelada, e não falha se ele não existe', () => {
    arquivosFalsos.add('file:///data/camera/VID_1.mp4');
    apagarArquivoDeGravacao('/data/camera/VID_1.mp4');
    expect(arquivosFalsos.size).toBe(0);
    expect(() => apagarArquivoDeGravacao('/data/camera/nada.mp4')).not.toThrow();
  });

  it('converte caminho de sistema em URI de arquivo', () => {
    expect(paraUriDeArquivo('/data/x.mp4')).toBe('file:///data/x.mp4');
    expect(paraUriDeArquivo('file:///data/x.mp4')).toBe('file:///data/x.mp4');
  });
});
