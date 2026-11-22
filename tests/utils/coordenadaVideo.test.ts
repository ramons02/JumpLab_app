import { toqueParaYVideo, yVideoParaTela } from '@/utils/coordenadaVideo';

const AREA = { largura: 300, altura: 400 };

describe('toqueParaYVideo', () => {
  it('vídeo mais alto que a área (faixas laterais): escala pela altura, sem faixa em cima', () => {
    const video = { largura: 720, altura: 1280 }; // escala 400/1280 = 0,3125
    expect(toqueParaYVideo(0, AREA, video)).toBe(0);
    expect(toqueParaYVideo(200, AREA, video)).toBeCloseTo(640, 10);
    expect(toqueParaYVideo(400, AREA, video)).toBeCloseTo(1280, 10);
  });

  it('vídeo mais largo (faixas em cima e embaixo): desconta a faixa', () => {
    const video = { largura: 1920, altura: 1080 }; // escala 300/1920; imagem com 168,75 de altura
    const margem = (400 - 168.75) / 2;
    expect(toqueParaYVideo(margem, AREA, video)).toBeCloseTo(0, 10);
    expect(toqueParaYVideo(200, AREA, video)).toBeCloseTo(540, 10);
  });

  it('toque na faixa preta devolve null', () => {
    const video = { largura: 1920, altura: 1080 };
    expect(toqueParaYVideo(10, AREA, video)).toBeNull();
    expect(toqueParaYVideo(395, AREA, video)).toBeNull();
  });

  it('sem o tamanho do vídeo, usa a área', () => {
    expect(toqueParaYVideo(123, AREA, null)).toBe(123);
    expect(toqueParaYVideo(123, AREA, { largura: 0, altura: 0 })).toBe(123);
  });
});

describe('yVideoParaTela', () => {
  it('ida e volta preserva o valor', () => {
    for (const video of [{ largura: 720, altura: 1280 }, { largura: 1920, altura: 1080 }, null]) {
      const tela = yVideoParaTela(300, AREA, video);
      expect(toqueParaYVideo(tela, AREA, video)).toBeCloseTo(300, 10);
    }
  });
});
