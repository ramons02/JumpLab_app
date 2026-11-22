import {
  percentualDentro,
  resumoTesteSugestao,
  type ParSugeridoMarcado,
} from '@/utils/resumoTesteSugestao';

const par = (protocolo: ParSugeridoMarcado['protocolo'], diferenca: number) => ({
  protocolo,
  sugerido: 300,
  marcado: 300 + diferenca,
});

describe('resumoTesteSugestao (spec 018, RN13)', () => {
  it('conta por grupo e no total, com a meta de 90%', () => {
    const resumo = resumoTesteSugestao([
      par('cmj_bi', 1),
      par('cmj_uni', -3),
      par('dj', 2),
      par('dj_uni', 0),
      par('dj', -1),
    ]);
    expect(resumo).toEqual({
      grupos: [
        { nome: 'CMJ', total: 2, dentro: 1 },
        { nome: 'Squat Jump', total: 0, dentro: 0 },
        { nome: 'Drop Jump', total: 3, dentro: 3 },
      ],
      total: 5,
      dentro: 4,
      meta: 90,
    });
    expect(percentualDentro(resumo)).toBe(80);
  });

  it('sem pares dá total 0', () => {
    const resumo = resumoTesteSugestao([]);
    expect(resumo.total).toBe(0);
    expect(percentualDentro(resumo)).toBe(0);
  });

  it('Squat Jump conta no seu grupo', () => {
    expect(resumoTesteSugestao([par('sj', 2)]).grupos[1]).toEqual({
      nome: 'Squat Jump',
      total: 1,
      dentro: 1,
    });
  });
});
