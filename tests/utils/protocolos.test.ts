import { ehProtocolo, ORDEM_PROTOCOLOS, PROTOCOLOS } from '@/utils/protocolos';

describe('catálogo de protocolos', () => {
  it('lista os seis protocolos na ordem de exibição', () => {
    expect(ORDEM_PROTOCOLOS).toEqual(['cmj_bi', 'cmj_uni', 'sj', 'dj', 'dj_uni', 'agach']);
  });

  it('marca as características de cada protocolo', () => {
    const com = (campo: 'unilateral' | 'dropJump' | 'agachamento') =>
      ORDEM_PROTOCOLOS.filter((p) => PROTOCOLOS[p][campo]);
    expect(com('unilateral')).toEqual(['cmj_uni', 'dj_uni']);
    expect(com('dropJump')).toEqual(['dj', 'dj_uni']);
    expect(com('agachamento')).toEqual(['agach']);
  });

  it('tem nome e descrição para todos', () => {
    expect(PROTOCOLOS.agach.nome).toBe('Agachamento com barra');
    ORDEM_PROTOCOLOS.forEach((p) => {
      expect(PROTOCOLOS[p].nome.length).toBeGreaterThan(0);
      expect(PROTOCOLOS[p].descricao.length).toBeGreaterThan(0);
    });
  });

  it('reconhece só identificadores válidos', () => {
    expect(ehProtocolo('dj_uni')).toBe(true);
    expect(ehProtocolo('xyz')).toBe(false);
    expect(ehProtocolo(null)).toBe(false);
    expect(ehProtocolo(3)).toBe(false);
  });
});
