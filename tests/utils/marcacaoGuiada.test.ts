import type { MarcasSalto, TentativaEmAndamento, TentativasPorPerna } from '@/types/attempt';
import { DICA_EVENTO, proximoEvento, seloDoQuadro } from '@/utils/marcacoes';
import { criarTentativasVazias, proximaTentativaIncompleta } from '@/utils/tentativas';

function completa(marcas: MarcasSalto = { decolagem: 10, aterrissagem: 60 }): TentativaEmAndamento {
  return { video: null, fpsSelecionado: 120, fpsConfirmado: 120, marcas, sugestao: null };
}

describe('proximoEvento (D23, passo guiado)', () => {
  it('CMJ: decolagem primeiro, depois aterrissagem, depois nada', () => {
    expect(proximoEvento({}, 'cmj_bi')).toBe('decolagem');
    expect(proximoEvento({ decolagem: 139 }, 'cmj_bi')).toBe('aterrissagem');
    expect(proximoEvento({ decolagem: 139, aterrissagem: 197 }, 'cmj_bi')).toBeNull();
  });

  it('Drop Jump: começa pelo toque no solo', () => {
    expect(proximoEvento({}, 'dj')).toBe('toque');
    expect(proximoEvento({ toque: 5, aterrissagem: 90 }, 'dj')).toBe('decolagem');
  });

  it('marcar só a aterrissagem não pula a decolagem', () => {
    expect(proximoEvento({ aterrissagem: 197 }, 'sj')).toBe('decolagem');
  });

  it('cada evento tem a dica do quadro a procurar', () => {
    expect(DICA_EVENTO.decolagem).toBe('Pare no último quadro com o pé ainda no chão.');
  });
});

describe('seloDoQuadro (D23)', () => {
  it('mostra a letra e o nome do evento marcado no quadro', () => {
    const marcas = { decolagem: 139, aterrissagem: 197 };
    expect(seloDoQuadro(marcas, 'cmj_bi', 139)).toBe('D · decolagem');
    expect(seloDoQuadro(marcas, 'cmj_bi', 197)).toBe('A · aterrissagem');
    expect(seloDoQuadro(marcas, 'cmj_bi', 150)).toBeNull();
  });

  it('ignora o toque num protocolo que não é Drop Jump', () => {
    expect(seloDoQuadro({ toque: 3 }, 'cmj_bi', 3)).toBeNull();
    expect(seloDoQuadro({ toque: 3 }, 'dj', 3)).toBe('T · toque no solo');
  });
});

describe('proximaTentativaIncompleta (D23, botão do rodapé)', () => {
  it('bilateral: a próxima tentativa incompleta da mesma perna', () => {
    const t = criarTentativasVazias('cmj_bi');
    t.unica![0] = completa();
    expect(proximaTentativaIncompleta(t, 'cmj_bi', { perna: 'unica', numero: 1 })).toEqual({
      perna: 'unica',
      numero: 2,
    });
  });

  it('volta para uma tentativa anterior que ficou incompleta', () => {
    const t = criarTentativasVazias('cmj_bi');
    t.unica![2] = completa();
    expect(proximaTentativaIncompleta(t, 'cmj_bi', { perna: 'unica', numero: 3 })).toEqual({
      perna: 'unica',
      numero: 1,
    });
  });

  it('unilateral: com a perna atual completa, vai para a outra perna', () => {
    const t: TentativasPorPerna = criarTentativasVazias('cmj_uni');
    t.direita = [completa(), completa(), completa()];
    expect(proximaTentativaIncompleta(t, 'cmj_uni', { perna: 'direita', numero: 3 })).toEqual({
      perna: 'esquerda',
      numero: 1,
    });
  });

  it('nada falta além da atual: null', () => {
    const t = criarTentativasVazias('cmj_bi');
    t.unica = [completa(), completa(), completa()];
    expect(proximaTentativaIncompleta(t, 'cmj_bi', { perna: 'unica', numero: 2 })).toBeNull();
  });
});
