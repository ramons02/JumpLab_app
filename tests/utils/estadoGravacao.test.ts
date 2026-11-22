import { estadoDaGravacao, taxaAlternativa, type SituacaoCamera } from '@/utils/estadoGravacao';

const base: SituacaoCamera = {
  temPermissao: true,
  podePedirPermissao: false,
  erro: false,
  gravando: false,
  taxa: 240,
  suportadas: [120, 240],
  negociada: { pedida: 240, fps: 240 },
};

describe('estadoDaGravacao', () => {
  it('sem permissão: pode pedir ou foi negada', () => {
    expect(estadoDaGravacao({ ...base, temPermissao: false, podePedirPermissao: true })).toBe(
      'sem_permissao',
    );
    expect(estadoDaGravacao({ ...base, temPermissao: false })).toBe('permissao_negada');
  });

  it('erro e gravando têm precedência sobre a taxa', () => {
    expect(estadoDaGravacao({ ...base, erro: true })).toBe('erro');
    expect(estadoDaGravacao({ ...base, gravando: true })).toBe('gravando');
  });

  it('preparando enquanto a câmera ainda não disse as taxas', () => {
    expect(estadoDaGravacao({ ...base, suportadas: null, taxa: null, negociada: null })).toBe(
      'preparando',
    );
  });

  it('sem taxa possível: aparelho sem alta velocidade', () => {
    expect(estadoDaGravacao({ ...base, taxa: null, suportadas: [] })).toBe('sem_alta_velocidade');
  });

  it('taxa fora das suportadas', () => {
    expect(estadoDaGravacao({ ...base, suportadas: [120] })).toBe('taxa_nao_suportada');
  });

  it('preparando até a câmera responder pela taxa pedida', () => {
    expect(estadoDaGravacao({ ...base, negociada: null })).toBe('preparando');
    expect(estadoDaGravacao({ ...base, negociada: { pedida: 120, fps: 120 } })).toBe('preparando');
  });

  it('pronta só quando a câmera escolheu a taxa pedida (FR-003)', () => {
    expect(estadoDaGravacao(base)).toBe('pronta');
    expect(estadoDaGravacao({ ...base, negociada: { pedida: 240, fps: 120 } })).toBe(
      'taxa_nao_suportada',
    );
    expect(estadoDaGravacao({ ...base, negociada: { pedida: 240, fps: undefined } })).toBe(
      'taxa_nao_suportada',
    );
  });
});

describe('taxaAlternativa', () => {
  it('oferece 120 no lugar de 240, e nada abaixo de 120', () => {
    expect(taxaAlternativa(240, [120, 240])).toBe(120);
    expect(taxaAlternativa(240, [120])).toBe(120);
    expect(taxaAlternativa(120, [120, 240])).toBeNull();
  });
});
