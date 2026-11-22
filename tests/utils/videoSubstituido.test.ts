import type { TentativasPorPerna, VideoSelecionado } from '@/types/attempt';
import { criarTentativasVazias, definirVideo } from '@/utils/tentativas';
import { videoParaApagarAoSubstituir } from '@/utils/videoSubstituido';

function video(uri: string, temporario = true): VideoSelecionado {
  return {
    uri,
    nome: 'gravacao_240fps.mp4',
    duracaoS: 3,
    fpsLido: 240,
    fpsDoArquivo: 240,
    temporario,
  };
}

function comVideos(...videos: (VideoSelecionado | null)[]): TentativasPorPerna {
  const tentativas = criarTentativasVazias('cmj_bi');
  return { unica: tentativas.unica?.map((t, i) => (videos[i] ? definirVideo(t, videos[i]) : t)) };
}

describe('videoParaApagarAoSubstituir', () => {
  it('gravação temporária usada só nesta tentativa é apagada', () => {
    expect(
      videoParaApagarAoSubstituir(comVideos(video('file:///cache/gravacoes/a.mp4')), 'unica', 0),
    ).toBe('file:///cache/gravacoes/a.mp4');
  });

  it('vídeo reaproveitado em outra tentativa não é apagado', () => {
    const mesmo = video('file:///cache/gravacoes/a.mp4');
    expect(videoParaApagarAoSubstituir(comVideos(mesmo, mesmo), 'unica', 0)).toBeNull();
  });

  it('vídeo da galeria (não temporário) nunca é apagado', () => {
    expect(
      videoParaApagarAoSubstituir(comVideos(video('content://galeria/1', false)), 'unica', 0),
    ).toBeNull();
  });

  it('tentativa sem vídeo não apaga nada', () => {
    expect(videoParaApagarAoSubstituir(comVideos(null), 'unica', 0)).toBeNull();
    expect(videoParaApagarAoSubstituir({}, 'direita', 0)).toBeNull();
  });

  it('o mesmo vídeo na outra perna também conta como uso', () => {
    const mesmo = video('file:///cache/gravacoes/a.mp4');
    const base = criarTentativasVazias('cmj_uni');
    const tentativas: TentativasPorPerna = {
      direita: base.direita?.map((t, i) => (i === 0 ? definirVideo(t, mesmo) : t)),
      esquerda: base.esquerda?.map((t, i) => (i === 0 ? definirVideo(t, mesmo) : t)),
    };
    expect(videoParaApagarAoSubstituir(tentativas, 'direita', 0)).toBeNull();
  });
});
