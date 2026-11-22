import { lerResumo } from '@/database/avaliacoes';
import { medirAgachamento } from '@/utils/biomechanics';
import { montarResumo, montarResumoAgachamento } from '@/utils/resumoAvaliacao';

import { CMJ_BILATERAL, novaAvaliacao } from '../helpers/avaliacoesDeTeste';
import { SERIE_CA02 } from '../helpers/serieDeTeste';

const PACIENTE = '11111111-1111-4111-8111-111111111111';
const agach = novaAvaliacao(PACIENTE, 'agach', [], { cargaKg: 60, serie: SERIE_CA02 });

describe('montarResumoAgachamento', () => {
  it('embrulha medirAgachamento com versao e tipo', () => {
    expect(montarResumoAgachamento(agach)).toEqual({
      versao: 1,
      tipo: 'agach',
      ...medirAgachamento(SERIE_CA02, 60),
    });
  });

  it('sem série ou sem carga lança erro', () => {
    expect(() => montarResumoAgachamento({ ...agach, serie: null })).toThrow('série');
    expect(() => montarResumoAgachamento({ ...agach, cargaKg: null })).toThrow('carga');
  });

  it('montarResumo escolhe pelo protocolo', () => {
    expect(montarResumo(agach).tipo).toBe('agach');
    expect(montarResumo(novaAvaliacao(PACIENTE, 'cmj_bi', CMJ_BILATERAL)).tipo).toBe('salto');
  });
});

describe('lerResumo do agachamento', () => {
  it('aceita o JSON gravado', () => {
    const resumo = montarResumoAgachamento(agach);
    expect(lerResumo(JSON.stringify(resumo))).toEqual(resumo);
  });

  it('recusa tipo desconhecido e campos faltando', () => {
    const resumo = montarResumoAgachamento(agach);
    expect(() => lerResumo(JSON.stringify({ ...resumo, tipo: 'corrida' }))).toThrow(
      'formato desconhecido',
    );
    const { repeticoes: _ignorado, ...semRepeticoes } = resumo;
    expect(() => lerResumo(JSON.stringify(semRepeticoes))).toThrow('formato desconhecido');
  });
});
