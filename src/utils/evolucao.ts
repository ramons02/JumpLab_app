import type { AvaliacaoDoHistorico, ResumoAvaliacao } from '@/types/assessment';
import type { PernaTentativa } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import { LSI_LIMITE_VERDE } from '@/utils/biomechanics';
import { CASAS_ALTURA, CASAS_LSI, CASAS_RSI, CASAS_VELOCIDADE } from '@/utils/formatacao';
import { PROTOCOLOS } from '@/utils/protocolos';

export type ProtocoloSalto = Exclude<Protocol, 'agach'>;
export type CorLinha = 'unica' | 'direita' | 'esquerda' | 'lsiAltura' | 'lsiRsi';

export interface PontoEvolucao {
  valor: number;
  baixaPrecisao: boolean;
}

export interface LinhaEvolucao {
  /** Legenda: "Direita (lesionada)", "LSI por altura (CMJ)" */
  nome: string;
  cor: CorLinha;
  /** Um por posição do eixo; null = avaliação de outra linha ou sem valor. */
  pontos: (PontoEvolucao | null)[];
}

export interface GraficoEvolucao {
  titulo: string;
  medida: string;
  unidade: 'cm' | 'RSI' | 'm/s' | '%';
  casas: number;
  /** 90 no LSI (LSI_LIMITE_VERDE); null nos demais */
  referencia: number | null;
  /** Datas AAAA-MM-DD na ordem de data_hora */
  eixo: string[];
  linhas: LinhaEvolucao[];
}

export const TITULO_LSI = 'Simetria (LSI)';
const ORDEM_PROTOCOLOS: readonly Protocol[] = ['cmj_bi', 'cmj_uni', 'sj', 'dj', 'dj_uni', 'agach'];
const PROTOCOLOS_POR_RSI: readonly Protocol[] = ['dj', 'dj_uni'];
const PONTOS_MINIMOS = 2;
const TAMANHO_DATA = 'AAAA-MM-DD'.length;
const ROTULO_PERNA = { direita: 'Direita', esquerda: 'Esquerda' } as const;

/** Protocolos presentes no histórico, na ordem fixa da tela. */
export function protocolosAvaliados(avaliacoes: AvaliacaoDoHistorico[]): Protocol[] {
  const presentes = new Set(avaliacoes.map((a) => a.protocolo));
  return ORDEM_PROTOCOLOS.filter((p) => presentes.has(p));
}

/** Alguma linha com pelo menos 2 pontos; com menos, a tela mostra "Avaliações insuficientes". */
export function temPontosSuficientes(grafico: GraficoEvolucao): boolean {
  return grafico.linhas.some((l) => l.pontos.filter((p) => p !== null).length >= PONTOS_MINIMOS);
}

function emOrdem(avaliacoes: AvaliacaoDoHistorico[]): AvaliacaoDoHistorico[] {
  return [...avaliacoes].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
}

function eixoDe(avaliacoes: AvaliacaoDoHistorico[]): string[] {
  return avaliacoes.map((a) => a.dataHora.slice(0, TAMANHO_DATA));
}

function nomeDaPerna(perna: 'direita' | 'esquerda', lesionada: PernaLesionada): string {
  return perna === lesionada ? `${ROTULO_PERNA[perna]} (lesionada)` : ROTULO_PERNA[perna];
}

function pontoDoSalto(
  resumo: ResumoAvaliacao,
  perna: PernaTentativa,
  porRsi: boolean,
): PontoEvolucao | null {
  if (resumo.tipo !== 'salto') return null;
  const medidas = resumo.pernas[perna];
  if (!medidas) return null;
  const valor = porRsi ? medidas.rsi : medidas.alturaCm;
  if (valor === null) return null;
  const baixaPrecisao = perna === 'unica' ? resumo.baixaPrecisao : medidas.baixaPrecisao;
  return { valor, baixaPrecisao };
}

function graficoDoAgachamento(avaliacoes: AvaliacaoDoHistorico[]): GraficoEvolucao {
  return {
    titulo: PROTOCOLOS.agach.nome,
    medida: 'Melhor velocidade',
    unidade: 'm/s',
    casas: CASAS_VELOCIDADE,
    referencia: null,
    eixo: eixoDe(avaliacoes),
    linhas: [
      {
        nome: PROTOCOLOS.agach.nome,
        cor: 'unica',
        pontos: avaliacoes.map(({ resumo }) =>
          resumo.tipo === 'agach'
            ? { valor: resumo.melhorVelocidadeMs, baixaPrecisao: false }
            : null,
        ),
      },
    ],
  };
}

/** Evolução de um protocolo, lida só do resumo guardado (sem recalcular). */
export function montarGraficoProtocolo(
  protocolo: Protocol,
  avaliacoes: AvaliacaoDoHistorico[],
  pernaLesionadaDoPaciente: PernaLesionada,
): GraficoEvolucao {
  const doProtocolo = emOrdem(avaliacoes.filter((a) => a.protocolo === protocolo));
  if (protocolo === 'agach') return graficoDoAgachamento(doProtocolo);

  const porRsi = PROTOCOLOS_POR_RSI.includes(protocolo);
  const pernas: PernaTentativa[] = PROTOCOLOS[protocolo].unilateral
    ? ['direita', 'esquerda']
    : ['unica'];
  return {
    titulo: PROTOCOLOS[protocolo].nome,
    medida: porRsi ? 'RSI' : 'Altura do salto',
    unidade: porRsi ? 'RSI' : 'cm',
    casas: porRsi ? CASAS_RSI : CASAS_ALTURA,
    referencia: null,
    eixo: eixoDe(doProtocolo),
    linhas: pernas.map((perna) => ({
      nome:
        perna === 'unica'
          ? PROTOCOLOS[protocolo].nome
          : nomeDaPerna(perna, pernaLesionadaDoPaciente),
      cor: perna,
      pontos: doProtocolo.map((a) => pontoDoSalto(a.resumo, perna, porRsi)),
    })),
  };
}

const LINHAS_LSI = [
  { protocolo: 'cmj_uni', nome: 'LSI por altura (CMJ)', cor: 'lsiAltura' },
  { protocolo: 'dj_uni', nome: 'LSI por RSI (Drop Jump)', cor: 'lsiRsi' },
] as const;

/** Simetria dos unilaterais no mesmo eixo; null sem nenhuma avaliação unilateral. */
export function montarGraficoLsi(avaliacoes: AvaliacaoDoHistorico[]): GraficoEvolucao | null {
  const unilaterais = emOrdem(
    avaliacoes.filter((a) => LINHAS_LSI.some((l) => l.protocolo === a.protocolo)),
  );
  if (unilaterais.length === 0) return null;
  const linhas = LINHAS_LSI.map(({ protocolo, nome, cor }) => ({
    nome,
    cor,
    pontos: unilaterais.map(({ protocolo: p, resumo }) => {
      if (p !== protocolo || resumo.tipo !== 'salto' || resumo.lsi?.valor == null) return null;
      return { valor: resumo.lsi.valor, baixaPrecisao: resumo.baixaPrecisao };
    }),
  })).filter((linha) => linha.pontos.some((p) => p !== null));
  return {
    titulo: TITULO_LSI,
    medida: 'LSI',
    unidade: '%',
    casas: CASAS_LSI,
    referencia: LSI_LIMITE_VERDE,
    eixo: eixoDe(unilaterais),
    linhas,
  };
}
