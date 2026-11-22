import {
  montarVideoGravado,
  taxaEhSuportada,
  taxaInicial,
  taxaNegociadaAtende,
  taxasAltaSuportadas,
} from '@/utils/taxaGravacao';

const faixas = (...maximos: number[]) => maximos.map((max) => ({ max }));

describe('taxasAltaSuportadas', () => {
  it('aparelho com 240 suporta 120 e 240, em ordem crescente', () => {
    expect(taxasAltaSuportadas(faixas(30, 240, 60))).toEqual([120, 240]);
  });

  it('aparelho só com 120 (máximo 120 ou 200) suporta só 120', () => {
    expect(taxasAltaSuportadas(faixas(30, 120))).toEqual([120]);
    expect(taxasAltaSuportadas(faixas(200))).toEqual([120]);
  });

  it('aparelho abaixo de 120 não suporta nenhuma', () => {
    expect(taxasAltaSuportadas(faixas(30, 60))).toEqual([]);
  });

  it('lista vazia devolve nenhuma', () => {
    expect(taxasAltaSuportadas([])).toEqual([]);
  });
});

describe('taxaInicial', () => {
  it('prefere 240, depois 120, senão nenhuma', () => {
    expect(taxaInicial([120, 240])).toBe(240);
    expect(taxaInicial([120])).toBe(120);
    expect(taxaInicial([])).toBeNull();
  });
});

describe('taxaEhSuportada', () => {
  it('diz se a taxa está entre as suportadas', () => {
    expect(taxaEhSuportada(240, [120])).toBe(false);
    expect(taxaEhSuportada(120, [120])).toBe(true);
  });
});

describe('taxaNegociadaAtende', () => {
  it('só atende quando a câmera escolheu a taxa pedida ou maior', () => {
    expect(taxaNegociadaAtende(240, 240)).toBe(true);
    expect(taxaNegociadaAtende(120, 240)).toBe(true);
    expect(taxaNegociadaAtende(240, 120)).toBe(false);
    expect(taxaNegociadaAtende(240, undefined)).toBe(false);
  });
});

describe('montarVideoGravado', () => {
  it('monta o vídeo temporário com a taxa gravada como FPS lido', () => {
    expect(montarVideoGravado('file:///cache/gravacoes/a.mp4', 240, 3.2, 239)).toEqual({
      uri: 'file:///cache/gravacoes/a.mp4',
      nome: 'gravacao_240fps.mp4',
      duracaoS: 3.2,
      fpsLido: 240,
      fpsDoArquivo: 239,
      temporario: true,
    });
  });

  it('sem taxa lida do arquivo, usa a taxa gravada', () => {
    expect(montarVideoGravado('file:///x.mp4', 120, 2, null).fpsDoArquivo).toBe(120);
  });
});
