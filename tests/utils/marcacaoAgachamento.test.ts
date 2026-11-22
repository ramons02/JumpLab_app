import type { MarcasRepeticao } from '@/types/squat';
import {
  aplicarMarca,
  MENSAGEM_ANTES_DA_ANTERIOR,
  MENSAGEM_CALIBRACAO,
  MENSAGEM_DEPOIS_DA_SEGUINTE,
  MENSAGEM_ORDEM,
  paraSerie,
  podeAdicionarRepeticao,
  repeticaoCompleta,
  repeticaoVazia,
  serieVazia,
  validarCalibracao,
  validarMarca,
} from '@/utils/marcacaoAgachamento';

import { repeticao } from '../helpers/serieDeTeste';

const marca = (quadro: number, y = 200) => ({ quadro, y });

describe('série e repetições', () => {
  it('serieVazia começa sem calibração e com uma repetição vazia', () => {
    expect(serieVazia('file:///v.mp4')).toEqual({
      uriDoVideo: 'file:///v.mp4',
      calibracao: null,
      repeticoes: [{ inicio: null, fundo: null, fim: null }],
    });
  });

  it('repeticaoCompleta só com os três eventos', () => {
    expect(repeticaoCompleta(repeticaoVazia())).toBe(false);
    expect(repeticaoCompleta({ ...repeticaoVazia(), inicio: marca(1), fundo: marca(2) })).toBe(
      false,
    );
    expect(repeticaoCompleta(repeticao([1, 1], [2, 2], [3, 3]))).toBe(true);
  });

  it('+ Repetição só com a última completa', () => {
    expect(podeAdicionarRepeticao([])).toBe(false);
    expect(podeAdicionarRepeticao([repeticaoVazia()])).toBe(false);
    expect(podeAdicionarRepeticao([repeticao([1, 1], [2, 2], [3, 3])])).toBe(true);
    expect(podeAdicionarRepeticao([repeticao([1, 1], [2, 2], [3, 3]), repeticaoVazia()])).toBe(
      false,
    );
  });
});

describe('validarCalibracao', () => {
  it('recusa topo igual à base', () => {
    expect(validarCalibracao(100, 100)).toBe(MENSAGEM_CALIBRACAO);
    expect(validarCalibracao(100, 158.5)).toBeNull();
  });
});

describe('validarMarca', () => {
  it('aceita a ordem início, fundo e fim', () => {
    let reps: MarcasRepeticao[] = [repeticaoVazia()];
    expect(validarMarca(reps, 0, 'inicio', marca(50))).toBeNull();
    reps = aplicarMarca(reps, 0, 'inicio', marca(50));
    expect(validarMarca(reps, 0, 'fundo', marca(100))).toBeNull();
    reps = aplicarMarca(reps, 0, 'fundo', marca(100));
    expect(validarMarca(reps, 0, 'fim', marca(137))).toBeNull();
  });

  it('CA04: fim no quadro 90 com o fundo no 102 é recusado', () => {
    const reps = [{ ...repeticaoVazia(), inicio: marca(50), fundo: marca(102) }];
    expect(validarMarca(reps, 0, 'fim', marca(90))).toBe(MENSAGEM_ORDEM);
  });

  it('fundo antes do início e no mesmo quadro são recusados', () => {
    const reps = [{ ...repeticaoVazia(), inicio: marca(50) }];
    expect(validarMarca(reps, 0, 'fundo', marca(40))).toBe(MENSAGEM_ORDEM);
    expect(validarMarca(reps, 0, 'fundo', marca(50))).toBe(MENSAGEM_ORDEM);
  });

  it('início da repetição 2 antes do fim da 1 é recusado', () => {
    const reps = [repeticao([10, 1], [50, 2], [80, 3]), repeticaoVazia()];
    expect(validarMarca(reps, 1, 'inicio', marca(70))).toBe(MENSAGEM_ANTES_DA_ANTERIOR);
    expect(validarMarca(reps, 1, 'inicio', marca(80))).toBe(MENSAGEM_ANTES_DA_ANTERIOR);
    expect(validarMarca(reps, 1, 'inicio', marca(81))).toBeNull();
  });

  it('fim da repetição 1 depois do início da 2 é recusado', () => {
    const reps = [repeticao([10, 1], [50, 2], [80, 3]), repeticao([100, 1], [150, 2], [180, 3])];
    expect(validarMarca(reps, 0, 'fim', marca(120))).toBe(MENSAGEM_DEPOIS_DA_SEGUINTE);
  });

  it('remarcar um evento numa posição válida é aceito', () => {
    const reps = [repeticao([10, 1], [50, 2], [80, 3])];
    expect(validarMarca(reps, 0, 'fundo', marca(60))).toBeNull();
    expect(validarMarca(reps, 0, 'fim', marca(90))).toBeNull();
  });
});

describe('aplicarMarca', () => {
  it('devolve uma lista nova sem alterar a recebida', () => {
    const reps: MarcasRepeticao[] = [repeticaoVazia()];
    const novas = aplicarMarca(reps, 0, 'inicio', marca(5, 120));
    expect(novas[0].inicio).toEqual({ quadro: 5, y: 120 });
    expect(reps[0].inicio).toBeNull();
    expect(novas).not.toBe(reps);
  });
});

describe('paraSerie', () => {
  const completa = repeticao([10, 224], [50, 300], [80, 224]);
  const andamento = {
    uriDoVideo: 'file:///v.mp4',
    calibracao: { topoY: 100, baseY: 158.5 },
    repeticoes: [completa, { ...repeticaoVazia(), inicio: marca(100) }],
  };

  it('nula sem FPS confirmado, sem base ou sem repetição completa', () => {
    expect(paraSerie(null, andamento)).toBeNull();
    expect(paraSerie(60, { ...andamento, calibracao: { topoY: 100, baseY: null } })).toBeNull();
    expect(paraSerie(60, { ...andamento, calibracao: null })).toBeNull();
    expect(paraSerie(60, { ...andamento, repeticoes: [repeticaoVazia()] })).toBeNull();
  });

  it('só com as repetições completas', () => {
    expect(paraSerie(60, andamento)).toEqual({
      fps: 60,
      calibracao: { topoY: 100, baseY: 158.5 },
      repeticoes: [completa],
    });
  });
});
