import type { MarcasSalto, TentativaEmAndamento, TentativasPorPerna } from '@/types/attempt';
import {
  aplicarMarcacao,
  eventosDoProtocolo,
  rotuloDoEvento,
  tentativaCompleta,
  todasCompletas,
  validarMarcacao,
} from '@/utils/marcacoes';
import { criarTentativasVazias } from '@/utils/tentativas';

function tentativa(marcas: MarcasSalto, fpsConfirmado: number | null = 240): TentativaEmAndamento {
  return { video: null, fpsSelecionado: fpsConfirmado, fpsConfirmado, marcas, sugestao: null };
}

const CMJ_COMPLETA = tentativa({ decolagem: 1000, aterrissagem: 1120 });
const DJ_COMPLETA = tentativa({ toque: 500, decolagem: 548, aterrissagem: 644 });

describe('eventosDoProtocolo e rotuloDoEvento', () => {
  it.each(['cmj_bi', 'cmj_uni', 'sj'] as const)('%s: decolagem e aterrissagem', (protocolo) => {
    expect(eventosDoProtocolo(protocolo)).toEqual(['decolagem', 'aterrissagem']);
    expect(rotuloDoEvento('decolagem', protocolo)).toBe('[Marcar Decolagem]');
    expect(rotuloDoEvento('aterrissagem', protocolo)).toBe('[Marcar Aterrissagem]');
  });

  it.each(['dj', 'dj_uni'] as const)(
    '%s: toque, decolagem e aterrissagem numerados',
    (protocolo) => {
      expect(eventosDoProtocolo(protocolo)).toEqual(['toque', 'decolagem', 'aterrissagem']);
      expect(rotuloDoEvento('toque', protocolo)).toBe('[1. Toque no Solo]');
      expect(rotuloDoEvento('decolagem', protocolo)).toBe('[2. Decolagem]');
      expect(rotuloDoEvento('aterrissagem', protocolo)).toBe('[3. Aterrissagem Final]');
    },
  );
});

describe('validarMarcacao', () => {
  it('CA05: aterrissagem no 990 com decolagem no 1000 é recusada', () => {
    expect(validarMarcacao({ decolagem: 1000 }, 'aterrissagem', 990)).toBe(
      'Marcação recusada: a aterrissagem precisa vir depois da decolagem (quadro 1000).',
    );
  });

  it('decolagem no 1130 com aterrissagem no 1120 é recusada', () => {
    expect(validarMarcacao({ aterrissagem: 1120 }, 'decolagem', 1130)).toBe(
      'Marcação recusada: a decolagem precisa vir antes da aterrissagem (quadro 1120).',
    );
  });

  it('toque no 560 com decolagem no 548 é recusado', () => {
    expect(validarMarcacao({ decolagem: 548 }, 'toque', 560)).toBe(
      'Marcação recusada: o toque no solo precisa vir antes da decolagem (quadro 548).',
    );
  });

  it('decolagem no 490 com toque no 500 é recusada', () => {
    expect(validarMarcacao({ toque: 500 }, 'decolagem', 490)).toBe(
      'Marcação recusada: a decolagem precisa vir depois do toque no solo (quadro 500).',
    );
  });

  it('o mesmo quadro de outro evento é recusado', () => {
    expect(validarMarcacao({ decolagem: 1000 }, 'aterrissagem', 1000)).toBe(
      'Marcação recusada: a aterrissagem precisa vir depois da decolagem (quadro 1000).',
    );
  });

  it('com mais de um conflito, cita o primeiro evento da ordem', () => {
    expect(validarMarcacao({ toque: 500, decolagem: 548 }, 'aterrissagem', 490)).toBe(
      'Marcação recusada: a aterrissagem precisa vir depois do toque no solo (quadro 500).',
    );
  });

  it('ordem certa é aceita, inclusive sem os outros eventos marcados', () => {
    expect(validarMarcacao({}, 'aterrissagem', 10)).toBeNull();
    expect(validarMarcacao({ decolagem: 1000 }, 'aterrissagem', 1120)).toBeNull();
    expect(validarMarcacao({ toque: 500, aterrissagem: 644 }, 'decolagem', 548)).toBeNull();
  });

  it('remarcar o mesmo evento ignora a marcação anterior dele', () => {
    expect(validarMarcacao({ decolagem: 1000, aterrissagem: 1120 }, 'decolagem', 1010)).toBeNull();
    expect(
      validarMarcacao({ decolagem: 1000, aterrissagem: 1120 }, 'decolagem', 1125),
    ).not.toBeNull();
  });
});

describe('aplicarMarcacao', () => {
  it('marca e substitui o mesmo evento sem alterar o objeto recebido', () => {
    const marcas = Object.freeze({ decolagem: 1000 });
    expect(aplicarMarcacao(marcas, 'aterrissagem', 1120)).toEqual({
      decolagem: 1000,
      aterrissagem: 1120,
    });
    expect(aplicarMarcacao(marcas, 'decolagem', 1010)).toEqual({ decolagem: 1010 });
    expect(marcas).toEqual({ decolagem: 1000 });
  });
});

describe('tentativaCompleta', () => {
  it('CMJ completo com FPS confirmado e os dois eventos', () => {
    expect(tentativaCompleta(CMJ_COMPLETA, 'cmj_bi')).toBe(true);
  });

  it('falsa sem FPS confirmado ou com evento faltando', () => {
    expect(
      tentativaCompleta(tentativa({ decolagem: 1000, aterrissagem: 1120 }, null), 'cmj_bi'),
    ).toBe(false);
    expect(tentativaCompleta(tentativa({ decolagem: 1000 }), 'cmj_bi')).toBe(false);
    expect(tentativaCompleta(tentativa({ decolagem: 548, aterrissagem: 644 }), 'dj')).toBe(false);
  });

  it('Drop Jump precisa dos três eventos', () => {
    expect(tentativaCompleta(DJ_COMPLETA, 'dj')).toBe(true);
  });
});

describe('todasCompletas', () => {
  function preencher(
    protocolo: 'cmj_bi' | 'cmj_uni',
    completa: TentativaEmAndamento,
  ): TentativasPorPerna {
    const vazias = criarTentativasVazias(protocolo);
    return Object.fromEntries(
      Object.entries(vazias).map(([perna, lista]) => [perna, lista?.map(() => completa)]),
    );
  }

  it('verdadeira com as três tentativas completas de cada perna', () => {
    expect(todasCompletas(preencher('cmj_bi', CMJ_COMPLETA), 'cmj_bi')).toBe(true);
    expect(todasCompletas(preencher('cmj_uni', CMJ_COMPLETA), 'cmj_uni')).toBe(true);
  });

  it('falsa com uma tentativa incompleta em qualquer perna', () => {
    const unilateral = preencher('cmj_uni', CMJ_COMPLETA);
    unilateral.esquerda = unilateral.esquerda?.map((t, i) => (i === 2 ? tentativa({}) : t));
    expect(todasCompletas(unilateral, 'cmj_uni')).toBe(false);
  });

  it('falsa sem nenhuma perna (rascunho do agachamento)', () => {
    expect(todasCompletas({}, 'agach')).toBe(false);
  });
});
