import { File } from 'expo-file-system';

import type { TentativasPorPerna, VideoSelecionado } from '@/types/attempt';
import { definirVideo, criarTentativasVazias } from '@/utils/tentativas';
import { descartarVideos } from '@/video/descartarVideos';

const mockExistentes = new Set<string>();
const mockApagar = jest.fn();

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    get exists() {
      return mockExistentes.has(uri);
    },
    delete: () => mockApagar(uri),
  })),
}));

function video(uri: string, temporario = true): VideoSelecionado {
  return { uri, nome: 'salto.mp4', duracaoS: 4, fpsLido: 240, fpsDoArquivo: 240, temporario };
}

function comVideos(...videos: VideoSelecionado[]): TentativasPorPerna {
  const tentativas = criarTentativasVazias('cmj_bi');
  return { unica: tentativas.unica?.map((t, i) => (videos[i] ? definirVideo(t, videos[i]) : t)) };
}

describe('descartarVideos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistentes.clear();
  });

  it('apaga só os temporários, uma vez por URI', async () => {
    mockExistentes.add('cache/a.mp4');
    mockExistentes.add('galeria/b.mp4');
    await descartarVideos(
      comVideos(video('cache/a.mp4'), video('cache/a.mp4'), video('galeria/b.mp4', false)),
    );
    expect(mockApagar).toHaveBeenCalledTimes(1);
    expect(mockApagar).toHaveBeenCalledWith('cache/a.mp4');
  });

  it('ignora arquivo que já não existe', async () => {
    await expect(descartarVideos(comVideos(video('cache/sumiu.mp4')))).resolves.toBeUndefined();
    expect(mockApagar).not.toHaveBeenCalled();
  });

  it('erro ao apagar não interrompe os demais', async () => {
    mockExistentes.add('cache/a.mp4');
    mockExistentes.add('cache/b.mp4');
    mockApagar.mockImplementationOnce(() => {
      throw new Error('ocupado');
    });
    await descartarVideos(comVideos(video('cache/a.mp4'), video('cache/b.mp4')));
    expect(mockApagar).toHaveBeenCalledTimes(2);
    expect(File).toHaveBeenCalledTimes(2);
  });
});
