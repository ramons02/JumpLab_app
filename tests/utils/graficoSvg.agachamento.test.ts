import cores from '@/theme/cores';
import type { ResultadoRepeticao } from '@/types/squat';
import { montarSvgRepeticoes } from '@/utils/graficoSvg';

function rep(numero: number, velocidadeMs: number): ResultadoRepeticao {
  return {
    numero,
    descidaS: 0.9,
    subidaS: 0.5,
    amplitudeCm: velocidadeMs * 50,
    velocidadeMs,
    potenciaW: 500,
  };
}

const CA02 = [rep(1, 0.9), rep(2, 1.0), rep(3, 0.8)];

function retangulos(svg: string) {
  return [...svg.matchAll(/<rect [^>]*height="([\d.]+)" fill="([^"]+)"/g)].map((m) => ({
    altura: Number(m[1]),
    cor: m[2],
  }));
}

describe('montarSvgRepeticoes', () => {
  it('três barras em ordem, a do meio mais alta, com os valores e "Rep n"', () => {
    const svg = montarSvgRepeticoes(CA02, 20);
    const barras = retangulos(svg);
    expect(barras).toHaveLength(3);
    expect(barras[1].altura).toBeGreaterThan(barras[0].altura);
    expect(barras[0].altura).toBeGreaterThan(barras[2].altura);
    for (const texto of ['0,90', '1,00', '0,80', 'Rep 1', 'Rep 2', 'Rep 3'])
      expect(svg).toContain(texto);
    expect(svg.indexOf('Rep 1')).toBeLessThan(svg.indexOf('Rep 3'));
  });

  it('perda de 20%: as duas primeiras no verde da marca e a última no verde do semáforo', () => {
    const barras = retangulos(montarSvgRepeticoes(CA02, 20));
    expect(barras[0].cor).toBe(cores.papel.marca);
    expect(barras[1].cor).toBe(cores.papel.marca);
    expect(barras[2].cor).toBe(cores.papel.lsi.verde.texto);
  });

  it.each([
    [35, cores.papel.lsi.amarelo.texto],
    [45, cores.papel.lsi.vermelho.texto],
  ])('perda de %p%: a última na cor do semáforo', (perda, cor) => {
    expect(retangulos(montarSvgRepeticoes(CA02, perda))[2].cor).toBe(cor);
  });

  it('uma repetição sem perda: uma barra no verde da marca', () => {
    const barras = retangulos(montarSvgRepeticoes([rep(1, 0.9)], null));
    expect(barras).toEqual([{ altura: expect.any(Number), cor: cores.papel.marca }]);
  });

  it('sem imagem nem URL externa', () => {
    const svg = montarSvgRepeticoes(CA02, 20);
    expect(svg).not.toContain('<img');
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});
