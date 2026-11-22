import {
  ESTADO_PARADO,
  estadoDoSalto,
  PX_DESENHO_POR_CM,
  poseDesenho,
  progressoDaRolagem,
  saltoDoDesenhoPx,
  SUBIDA_MAXIMA_PX,
  SUBIDA_PADRAO_PX,
} from '@/utils/poseDesenho';

describe('progressoDaRolagem', () => {
  it('vai de 0 a 1 nos primeiros 110 px quando a lista rola bastante', () => {
    expect(progressoDaRolagem(0, 500)).toBe(0);
    expect(progressoDaRolagem(55, 500)).toBeCloseTo(0.5);
    expect(progressoDaRolagem(110, 500)).toBe(1);
    expect(progressoDaRolagem(400, 500)).toBe(1);
  });

  it('rolagem negativa (puxar para baixo) dá 0', () => {
    expect(progressoDaRolagem(-30, 500)).toBe(0);
  });

  it('com lista curta usa a rolagem disponível, nunca menos de 60 px', () => {
    expect(progressoDaRolagem(40, 80)).toBeCloseTo(0.5);
    expect(progressoDaRolagem(30, 40)).toBeCloseTo(0.5);
    expect(progressoDaRolagem(30, 0)).toBeCloseTo(0.5);
  });
});

describe('estadoDoSalto', () => {
  const SUBIDA = 53;

  it('progresso 0 é o estado parado', () => {
    expect(estadoDoSalto(0, SUBIDA)).toEqual(ESTADO_PARADO);
  });

  it('0,2: agachado, com os braços para trás', () => {
    const estado = estadoDoSalto(0.2, SUBIDA);
    expect(estado.agachamento).toBeGreaterThan(0.5);
    expect(estado.bracos).toBeLessThan(0);
    expect(estado.subidaPx).toBe(0);
  });

  it('0,4: impulso, estendendo as pernas com os braços para cima', () => {
    const estado = estadoDoSalto(0.4, SUBIDA);
    expect(estado.agachamento).toBeCloseTo(0.45);
    expect(estado.bracos).toBe(1);
    expect(estado.subidaPx).toBe(0);
  });

  it('a partir de 0,9 chega na subida pedida e fica lá', () => {
    expect(estadoDoSalto(0.9, SUBIDA).subidaPx).toBeCloseTo(SUBIDA);
    expect(estadoDoSalto(1, SUBIDA).subidaPx).toBe(SUBIDA);
    expect(estadoDoSalto(0.675, SUBIDA).subidaPx).toBeCloseTo(SUBIDA / 2);
  });
});

describe('saltoDoDesenhoPx', () => {
  it('sem medida usa a subida padrão', () => {
    expect(saltoDoDesenhoPx(null)).toBe(SUBIDA_PADRAO_PX);
  });

  it('converte pela escala da ilustração, com teto', () => {
    expect(saltoDoDesenhoPx(20)).toBeCloseTo(20 * PX_DESENHO_POR_CM);
    expect(saltoDoDesenhoPx(80)).toBe(SUBIDA_MAXIMA_PX);
  });
});

describe('poseDesenho', () => {
  it('agachado deixa o quadril mais baixo (y maior) que em pé', () => {
    const empe = poseDesenho({ ...ESTADO_PARADO, bracos: 1 }, 0);
    const agachado = poseDesenho({ ...ESTADO_PARADO, agachamento: 1, bracos: 1 }, 0);
    expect(agachado.quadril.direito.y).toBeGreaterThan(empe.quadril.direito.y);
  });

  it('a subida desloca o corpo para cima na mesma medida e tira os pés do chão', () => {
    const pose = poseDesenho({ ...ESTADO_PARADO, subidaPx: 40, bracos: 1 }, 0);
    expect(pose.deslocamentoY).toBe(-40);
    expect(pose.noAr).toBe(true);
    expect(poseDesenho(ESTADO_PARADO, 0).noAr).toBe(false);
  });

  it('com barra, as mãos ficam acima do ombro', () => {
    const pose = poseDesenho({ ...ESTADO_PARADO, barra: true }, 0);
    expect(pose.bracoDireito.mao.y).toBeLessThan(pose.yOmbro);
    expect(pose.bracoEsquerdo.mao.y).toBeLessThan(pose.yOmbro);
  });

  it('é determinística: a mesma entrada dá sempre a mesma saída', () => {
    const estado = { agachamento: 0.3, subidaPx: 10, bracos: -0.5, barra: false };
    expect(poseDesenho(estado, 1.7)).toEqual(poseDesenho(estado, 1.7));
  });

  it('parado, respira com o tempo; fora do parado, o tempo não muda a pose', () => {
    expect(poseDesenho(ESTADO_PARADO, 0.7).yOmbro).not.toBe(poseDesenho(ESTADO_PARADO, 0).yOmbro);
    const agachado = { ...ESTADO_PARADO, agachamento: 0.5 };
    expect(poseDesenho(agachado, 0.7)).toEqual(poseDesenho(agachado, 0));
  });
});
