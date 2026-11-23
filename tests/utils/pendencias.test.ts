import type { MarcasSalto, TentativaEmAndamento, VideoSelecionado } from '@/types/attempt';
import { pendenciasDaAvaliacao } from '@/utils/pendencias';

const VIDEO: VideoSelecionado = {
  uri: 'file:///v.mp4',
  nome: 'v.mp4',
  duracaoS: 3,
  fpsLido: 240,
  fpsDoArquivo: 240,
  temporario: true,
};

function tentativa(
  marcas: MarcasSalto,
  fpsConfirmado: number | null = 240,
  comVideo = true,
): TentativaEmAndamento {
  return {
    video: comVideo ? VIDEO : null,
    fpsSelecionado: fpsConfirmado,
    fpsConfirmado,
    marcas,
    sugestao: null,
  };
}

const CMJ_OK = tentativa({ decolagem: 10, aterrissagem: 80 });

describe('pendenciasDaAvaliacao', () => {
  it('nada a dizer quando todas estão completas', () => {
    expect(pendenciasDaAvaliacao({ unica: [CMJ_OK, CMJ_OK, CMJ_OK] }, 'cmj_bi')).toEqual([]);
  });

  it('diz vídeo, FPS e eventos que faltam, uma linha por tentativa', () => {
    const tentativas = {
      unica: [
        CMJ_OK,
        tentativa({}, 240, false),
        tentativa({ decolagem: 10 }, null),
        tentativa({ decolagem: 0 }),
        tentativa({}),
      ],
    };
    expect(pendenciasDaAvaliacao(tentativas, 'cmj_bi')).toEqual([
      'Tentativa 2: sem vídeo',
      'Tentativa 3: FPS não confirmado',
      'Tentativa 4: falta marcar aterrissagem',
      'Tentativa 5: falta marcar decolagem e aterrissagem',
    ]);
  });

  it('drop jump lista os três eventos', () => {
    expect(pendenciasDaAvaliacao({ unica: [tentativa({})] }, 'dj')).toEqual([
      'Tentativa 1: falta marcar toque no solo, decolagem e aterrissagem',
    ]);
  });

  it('unilateral diz a perna', () => {
    const tentativas = { direita: [CMJ_OK], esquerda: [tentativa({ decolagem: 5 })] };
    expect(pendenciasDaAvaliacao(tentativas, 'cmj_uni')).toEqual([
      'Perna esquerda, tentativa 1: falta marcar aterrissagem',
    ]);
  });
});
