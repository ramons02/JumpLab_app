import type { ResumoSalto } from '@/types/assessment';
import { calcularResultadoSalto } from '@/utils/biomechanics';
import { alturaDoTopo, montarResumoSalto } from '@/utils/resumoAvaliacao';

import {
  CMJ_BILATERAL,
  CMJ_UNILATERAL,
  DROP_JUMP,
  novaAvaliacao,
} from '../helpers/avaliacoesDeTeste';

const PACIENTE = '11111111-1111-4111-8111-111111111111';

describe('montarResumoSalto', () => {
  it('CMJ bilateral: o resultado da spec 007 com versao e tipo', () => {
    const resumo = montarResumoSalto(novaAvaliacao(PACIENTE, 'cmj_bi', CMJ_BILATERAL));
    expect(resumo).toEqual({
      versao: 1,
      tipo: 'salto',
      ...calcularResultadoSalto(CMJ_BILATERAL, { ehDropJump: false, pernaLesionada: 'direita' }),
    });
  });

  it('CMJ unilateral: passa a perna lesionada da avaliação', () => {
    const resumo = montarResumoSalto(
      novaAvaliacao(PACIENTE, 'cmj_uni', CMJ_UNILATERAL, { pernaLesionada: 'esquerda' }),
    );
    expect(resumo).toEqual({
      versao: 1,
      tipo: 'salto',
      ...calcularResultadoSalto(CMJ_UNILATERAL, { ehDropJump: false, pernaLesionada: 'esquerda' }),
    });
    expect(resumo.lsi?.modo).toBe('lesionada');
  });

  it('Drop Jump passa ehDropJump verdadeiro (há RSI)', () => {
    const resumo = montarResumoSalto(novaAvaliacao(PACIENTE, 'dj', DROP_JUMP));
    expect(resumo.pernas.unica?.rsi).not.toBeNull();
    expect(resumo).toEqual({
      versao: 1,
      tipo: 'salto',
      ...calcularResultadoSalto(DROP_JUMP, { ehDropJump: true, pernaLesionada: 'direita' }),
    });
  });

  it('agachamento lança erro nesta entrega', () => {
    expect(() => montarResumoSalto(novaAvaliacao(PACIENTE, 'agach', [], { cargaKg: 60 }))).toThrow(
      'HU014',
    );
  });
});

describe('alturaDoTopo', () => {
  const unilateral = (pernaLesionada: 'direita' | 'esquerda' | 'nenhuma') =>
    montarResumoSalto(novaAvaliacao(PACIENTE, 'cmj_uni', CMJ_UNILATERAL, { pernaLesionada }));

  it('bilateral usa a perna única', () => {
    const resumo = montarResumoSalto(novaAvaliacao(PACIENTE, 'cmj_bi', CMJ_BILATERAL));
    expect(alturaDoTopo(resumo, 'direita')).toEqual({
      alturaCm: resumo.pernas.unica?.alturaCm,
      perna: 'unica',
      motivo: 'unica',
    });
  });

  it('unilateral com perna lesionada esquerda usa a esquerda', () => {
    const resumo = unilateral('esquerda');
    expect(alturaDoTopo(resumo, 'esquerda')).toEqual({
      alturaCm: resumo.pernas.esquerda?.alturaCm,
      perna: 'esquerda',
      motivo: 'lesionada',
    });
  });

  it('unilateral sem perna lesionada usa a perna mais fraca do LSI', () => {
    const resumo = unilateral('nenhuma');
    expect(resumo.lsi?.pernaMaisFraca).toBe('direita');
    expect(alturaDoTopo(resumo, 'nenhuma')).toEqual({
      alturaCm: resumo.pernas.direita?.alturaCm,
      perna: 'direita',
      motivo: 'mais_fraca',
    });
  });

  it('sem perna mais fraca, usa a direita', () => {
    const base = unilateral('nenhuma');
    const resumo: ResumoSalto = { ...base, lsi: { ...base.lsi!, pernaMaisFraca: null } };
    expect(alturaDoTopo(resumo, 'nenhuma')).toMatchObject({
      perna: 'direita',
      motivo: 'mais_fraca',
    });
  });
});
