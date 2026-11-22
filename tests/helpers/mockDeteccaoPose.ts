import type { PontosDoQuadro } from '@/types/sugestao';

/*
 * Simulação do módulo nativo `deteccao-pose` (spec 018). O teste define o total de quadros e os pontos
 * de cada quadro com `simularVideo`, ou segura a análise com `segurarAnalise` para ver o estado
 * "analisando" e o cancelamento.
 */

export interface EventoProgresso {
  idAnalise: string;
  fracao: number;
}

export const ANALISE_CANCELADA = 'ANALISE_CANCELADA';
export const VIDEO_ILEGIVEL = 'VIDEO_ILEGIVEL';

type Pontos = (quadro: number) => Omit<PontosDoQuadro, 'quadro'>;

interface Pendente {
  idAnalise: string;
  quadros: number[];
  liberar: () => void;
  rejeitar: (erro: Error) => void;
}

let total = 0;
let pontos: Pontos = () => ({ pes: null, quadris: null });
let segurar = false;
const pendentes: Pendente[] = [];
const ouvintes = new Set<(evento: EventoProgresso) => void>();

function erroComCodigo(codigo: string): Error {
  return Object.assign(new Error(codigo), { code: codigo });
}

function responder(quadros: number[]): PontosDoQuadro[] {
  return quadros.map((quadro) => ({ quadro, ...pontos(quadro) }));
}

export const analisarQuadros = jest.fn(
  (idAnalise: string, _uri: string, _fps: number, quadros: number[]) =>
    new Promise<PontosDoQuadro[]>((resolve, reject) => {
      const liberar = () => {
        for (const o of ouvintes) o({ idAnalise, fracao: 1 });
        resolve(responder(quadros));
      };
      if (segurar) pendentes.push({ idAnalise, quadros, liberar, rejeitar: reject });
      else liberar();
    }),
);

export const cancelarAnalise = jest.fn((idAnalise: string) => {
  for (const p of pendentes.filter((x) => x.idAnalise === idAnalise)) {
    pendentes.splice(pendentes.indexOf(p), 1);
    p.rejeitar(erroComCodigo(ANALISE_CANCELADA));
  }
});

export const totalDeQuadrosDoArquivo = jest.fn(async (_uri: string) => total);

export const adicionarOuvinteProgresso = jest.fn((ouvinte: (e: EventoProgresso) => void) => {
  ouvintes.add(ouvinte);
  return { remove: () => ouvintes.delete(ouvinte) };
});

/** Define o vídeo simulado: total de quadros e os pontos de cada quadro. */
export function simularVideo(quadros: number, porQuadro: Pontos): void {
  total = quadros;
  pontos = porQuadro;
}

/** As próximas análises ficam pendentes até `liberarAnalise` (ou o cancelamento). */
export function segurarAnalise(): void {
  segurar = true;
}

/** Emite um progresso para a análise pendente mais antiga. */
export function emitirProgresso(fracao: number): void {
  const p = pendentes[0];
  if (p) for (const o of ouvintes) o({ idAnalise: p.idAnalise, fracao });
}

/** Libera a análise pendente mais antiga, devolvendo os pontos simulados. */
export function liberarAnalise(): void {
  pendentes.shift()?.liberar();
}

export function analisesPendentes(): number {
  return pendentes.length;
}

/** Volta ao estado inicial (chamar no beforeEach). */
export function reiniciarDeteccaoPose(): void {
  total = 0;
  pontos = () => ({ pes: null, quadris: null });
  segurar = false;
  pendentes.length = 0;
  ouvintes.clear();
  analisarQuadros.mockClear();
  cancelarAnalise.mockClear();
  totalDeQuadrosDoArquivo.mockClear();
  adicionarOuvinteProgresso.mockClear();
}

/** Pontos de pés e quadris com os dois pés na altura `y` (perna de 0,4 na imagem). */
export function pesNaAltura(y: number): Omit<PontosDoQuadro, 'quadro'> {
  const ponto = (py: number) => ({ x: 0.5, y: py, visibilidade: 0.9 });
  const pe = [ponto(y - 0.02), ponto(y - 0.01), ponto(y)];
  return {
    pes: { esquerdo: pe, direito: pe },
    quadris: { esquerdo: ponto(y - 0.42), direito: ponto(y - 0.42) },
  };
}
