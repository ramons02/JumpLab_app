import type { AvaliacaoDoHistorico, ResumoAvaliacao } from '@/types/assessment';
import type {
  EstadoMapa,
  GrupoMuscular,
  GruposConsolidados,
  LadoGrupo,
  LadoPerna,
  PontoMelhoria,
} from '@/types/melhoria';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import { LSI_LIMITE_VERDE, PERDA_LIMITE_VERDE } from '@/utils/biomechanics';
import {
  CASAS_ALTURA,
  CASAS_LSI,
  CASAS_PERDA,
  CASAS_RSI,
  CASAS_TEMPO_MS,
  CASAS_VELOCIDADE,
  formatarDecimal,
} from '@/utils/formatacao';
import { PROTOCOLOS } from '@/utils/protocolos';
import { ROTULO_PERNA } from '@/utils/rotulos';

/**
 * "O que melhorar" (HU017): regras sobre o resultado já calculado, sem medir nada (princípio III).
 * Valores de referência do protótipo validado com o Ramon.
 */
export const RSI_REFERENCIA = 1.0;
export const TEMPO_CONTATO_REFERENCIA_MS = 250;
export const VELOCIDADE_REFERENCIA_MS = 0.5;
const PORCENTO = 100;

export const ROTULO_GRUPO: Record<GrupoMuscular, string> = {
  quadriceps: 'Quadríceps',
  gluteo_maximo: 'Glúteo máximo',
  gluteo_medio: 'Glúteo médio',
  posteriores: 'Posteriores da coxa',
  triceps_sural: 'Tríceps sural (panturrilha)',
};

export const MOTIVO_AVALIADOR = 'citado pelo avaliador';

/** O que as regras precisam saber da avaliação. */
export type AvaliacaoParaMelhorias = Pick<
  AvaliacaoDoHistorico,
  'protocolo' | 'pernaLesionada' | 'resumo'
>;

const LADOS: LadoPerna[] = ['direita', 'esquerda'];
const fmt = formatarDecimal;

function grupos(lista: GrupoMuscular[], lado: LadoGrupo) {
  return lista.map((grupo) => ({ grupo, lado }));
}

/** Perna comparada no LSI: a lesionada ou, no modo "mais fraca", a mais fraca. */
function pernaAlvo(resumo: ResumoAvaliacao, pernaLesionada: PernaLesionada): LadoPerna | null {
  if (resumo.tipo !== 'salto' || !resumo.lsi) return null;
  if (resumo.lsi.modo === 'mais_fraca') return resumo.lsi.pernaMaisFraca;
  return pernaLesionada === 'nenhuma' ? null : pernaLesionada;
}

/** Sugestões a partir das medidas; o avaliador revisa antes de salvar. Nunca cita exercício. */
export function sugerirMelhorias(
  resumo: ResumoAvaliacao,
  pernaLesionada: PernaLesionada,
): PontoMelhoria[] {
  const pontos: PontoMelhoria[] = [];
  const sugerir = (ponto: Omit<PontoMelhoria, 'origem'>) =>
    pontos.push({ ...ponto, origem: 'sugerido' });

  if (resumo.tipo === 'agach') {
    const perda = resumo.perdaVelocidadePct;
    if (perda !== null && perda > PERDA_LIMITE_VERDE) {
      sugerir({
        titulo: 'Resistência de força',
        grupos: grupos(['quadriceps', 'gluteo_maximo'], 'ambas'),
        motivo: `perda de velocidade ${fmt(perda, CASAS_PERDA)}% (referência até ${PERDA_LIMITE_VERDE}%)`,
        foco: `Manter a velocidade ao longo da série (perda de ${fmt(perda, CASAS_PERDA)}%, referência até ${PERDA_LIMITE_VERDE}%).`,
      });
    }
    const melhor = resumo.melhorVelocidadeMs;
    if (melhor < VELOCIDADE_REFERENCIA_MS) {
      const referencia = fmt(VELOCIDADE_REFERENCIA_MS, 1);
      sugerir({
        titulo: 'Potência',
        grupos: grupos(['quadriceps', 'gluteo_maximo'], 'ambas'),
        motivo: `melhor velocidade ${fmt(melhor, CASAS_VELOCIDADE)} m/s (referência ${referencia} m/s)`,
        foco: `Intenção de velocidade na subida (${fmt(melhor, CASAS_VELOCIDADE)} m/s, referência ${referencia} m/s).`,
      });
    }
    return pontos;
  }

  const alvo = pernaAlvo(resumo, pernaLesionada);
  const valor = resumo.lsi?.valor ?? null;
  if (resumo.lsi && alvo && valor !== null && valor < LSI_LIMITE_VERDE) {
    const qual = resumo.lsi.modo === 'mais_fraca' ? 'a mais fraca' : 'lesionada';
    const nome = `perna ${ROTULO_PERNA[alvo].toLowerCase()} (${qual})`;
    const lsi = fmt(valor, CASAS_LSI);
    if (resumo.lsi.base === 'altura') {
      sugerir({
        titulo: `Força e potência da ${nome}`,
        grupos: grupos(['quadriceps', 'gluteo_maximo', 'posteriores'], alvo),
        motivo: `LSI ${lsi}% (bom a partir de ${LSI_LIMITE_VERDE}%)`,
        foco: `Força e potência unilateral para levar o LSI de ${lsi}% a ${LSI_LIMITE_VERDE}% ou mais.`,
      });
    } else {
      sugerir({
        titulo: `Reatividade da ${nome}`,
        grupos: grupos(['triceps_sural', 'quadriceps'], alvo),
        motivo: `LSI pelo RSI ${lsi}% (bom a partir de ${LSI_LIMITE_VERDE}%)`,
        foco: `Pliometria unilateral para levar o LSI pelo RSI de ${lsi}% a ${LSI_LIMITE_VERDE}% ou mais.`,
      });
    }
  }

  const pernas = Object.values(resumo.pernas);
  const rsis = pernas.flatMap((p) => (p.rsi === null ? [] : [p.rsi]));
  const contatos = pernas.flatMap((p) => (p.tempoContatoMs === null ? [] : [p.tempoContatoMs]));
  if (rsis.length > 0 && Math.min(...rsis) < RSI_REFERENCIA) {
    const rsi = fmt(Math.min(...rsis), CASAS_RSI);
    const referencia = fmt(RSI_REFERENCIA, 1);
    sugerir({
      titulo: 'Reatividade',
      grupos: grupos(['triceps_sural'], 'ambas'),
      motivo: `RSI ${rsi} (referência ${referencia})`,
      foco: `Ciclo alongamento-encurtamento rápido, incluindo o tendão de Aquiles (RSI ${rsi}, referência ${referencia}).`,
    });
  }
  if (contatos.length > 0 && Math.max(...contatos) > TEMPO_CONTATO_REFERENCIA_MS) {
    const contato = fmt(Math.max(...contatos), CASAS_TEMPO_MS);
    sugerir({
      titulo: 'Tempo de chão longo',
      grupos: grupos(['triceps_sural', 'quadriceps'], 'ambas'),
      motivo: `contato ${contato} ms (referência até ${TEMPO_CONTATO_REFERENCIA_MS} ms)`,
      foco: `Rigidez e resposta rápida no contato (${contato} ms, referência até ${TEMPO_CONTATO_REFERENCIA_MS} ms).`,
    });
  }
  return pontos;
}

/** Une os grupos de todos os pontos; "ambas" vira as duas pernas, sem repetir. */
export function consolidarGrupos(pontos: PontoMelhoria[]): GruposConsolidados {
  const resultado: GruposConsolidados = {};
  for (const ponto of pontos) {
    for (const { grupo, lado } of ponto.grupos) {
      const lista = resultado[grupo] ?? [];
      for (const perna of lado === 'ambas' ? LADOS : [lado]) {
        if (!lista.includes(perna)) lista.push(perna);
      }
      resultado[grupo] = lista;
    }
  }
  return resultado;
}

export function gruposAvaliados(protocolo: Protocol): GrupoMuscular[] {
  const info = PROTOCOLOS[protocolo];
  if (info.agachamento) return ['quadriceps', 'gluteo_maximo'];
  if (info.dropJump) return ['quadriceps', 'gluteo_maximo', 'posteriores', 'triceps_sural'];
  return ['quadriceps', 'gluteo_maximo', 'posteriores'];
}

/** melhorar (citado num ponto) > ok (avaliado pelo protocolo) > neutro. */
export function estadoDoGrupo(
  consolidados: GruposConsolidados,
  avaliados: GrupoMuscular[],
  grupo: GrupoMuscular,
  lado: LadoPerna,
): EstadoMapa {
  if (consolidados[grupo]?.includes(lado)) return 'melhorar';
  return avaliados.includes(grupo) ? 'ok' : 'neutro';
}

export function textoDoLado(lados: LadoPerna[]): string {
  if (lados.length >= 2) return 'ambas as pernas';
  return lados.length === 1 ? `perna ${ROTULO_PERNA[lados[0]].toLowerCase()}` : '';
}

/* Mapa e tabela (estilo de laudo de dinamometria): locais numerados, ímpar = perna direita. */

export interface LocalMapa {
  id: 'quadril' | 'coxa' | 'panturrilha';
  nome: string;
  grupos: GrupoMuscular[];
  numero: Record<LadoPerna, number>;
}

export const LOCAIS_MAPA: LocalMapa[] = [
  {
    id: 'quadril',
    nome: 'Quadril',
    grupos: ['gluteo_maximo', 'gluteo_medio'],
    numero: { direita: 1, esquerda: 2 },
  },
  {
    id: 'coxa',
    nome: 'Coxa',
    grupos: ['quadriceps', 'posteriores'],
    numero: { direita: 3, esquerda: 4 },
  },
  {
    id: 'panturrilha',
    nome: 'Panturrilha',
    grupos: ['triceps_sural'],
    numero: { direita: 5, esquerda: 6 },
  },
];

export function estadoDoLocal(
  consolidados: GruposConsolidados,
  avaliados: GrupoMuscular[],
  local: LocalMapa,
  lado: LadoPerna,
): EstadoMapa {
  const estados = local.grupos.map((g) => estadoDoGrupo(consolidados, avaliados, g, lado));
  if (estados.includes('melhorar')) return 'melhorar';
  return estados.includes('ok') ? 'ok' : 'neutro';
}

/** Motivos (sem repetir) dos pontos que citam algum grupo do local naquele lado. */
export function motivosDoLocal(
  pontos: PontoMelhoria[],
  local: LocalMapa,
  lado: LadoGrupo,
): string[] {
  const motivos: string[] = [];
  for (const ponto of pontos) {
    const cita = ponto.grupos.some(
      (g) =>
        local.grupos.includes(g.grupo) &&
        (g.lado === 'ambas' || lado === 'ambas' || g.lado === lado),
    );
    if (cita && ponto.motivo && !motivos.includes(ponto.motivo)) motivos.push(ponto.motivo);
  }
  return motivos;
}

export interface LinhaLocal {
  local: LocalMapa;
  lado: LadoGrupo;
  lados: LadoPerna[];
  estado: Exclude<EstadoMapa, 'neutro'>;
  /** Grupos do local que aparecem (avaliados ou citados) */
  grupos: GrupoMuscular[];
  motivos: string[];
}

/** Uma linha por local e perna no unilateral; uma por local ("ambas") nos demais. */
export function linhasDaTabela(
  pontos: PontoMelhoria[],
  avaliacao: AvaliacaoParaMelhorias,
): LinhaLocal[] {
  const consolidados = consolidarGrupos(pontos);
  const avaliados = gruposAvaliados(avaliacao.protocolo);
  const porPerna = PROTOCOLOS[avaliacao.protocolo].unilateral;
  const linhas: LinhaLocal[] = [];
  for (const local of LOCAIS_MAPA) {
    for (const lado of porPerna ? LADOS : (['ambas'] as const)) {
      const lados = lado === 'ambas' ? LADOS : [lado];
      const estados = lados.map((l) => estadoDoLocal(consolidados, avaliados, local, l));
      if (estados.every((e) => e === 'neutro')) continue;
      const estado = estados.includes('melhorar') ? 'melhorar' : 'ok';
      linhas.push({
        local,
        lado,
        lados,
        estado,
        grupos: local.grupos.filter((g) =>
          lados.some((l) => estadoDoGrupo(consolidados, avaliados, g, l) !== 'neutro'),
        ),
        motivos: estado === 'melhorar' ? motivosDoLocal(pontos, local, lado) : [],
      });
    }
  }
  return linhas;
}

/** Medida mostrada na linha: altura, RSI ou melhor velocidade. */
export function medidaDoLado(avaliacao: AvaliacaoParaMelhorias, lado: LadoPerna): string {
  const { resumo } = avaliacao;
  if (resumo.tipo === 'agach') {
    return `${fmt(resumo.melhorVelocidadeMs, CASAS_VELOCIDADE)} m/s`;
  }
  const perna = resumo.pernas.unica ?? resumo.pernas[lado];
  if (!perna) return '—';
  if (PROTOCOLOS[avaliacao.protocolo].dropJump) {
    return perna.rsi === null ? '—' : `RSI ${fmt(perna.rsi, CASAS_RSI)}`;
  }
  return `${fmt(perna.alturaCm, CASAS_ALTURA)} cm`;
}

/**
 * Razão em %: LSI na perna alvo e 100 na outra (unilateral); 100 − perda (agachamento);
 * RSI ÷ referência (Drop Jump bilateral); null sem referência.
 */
export function razaoDoLado(avaliacao: AvaliacaoParaMelhorias, lado: LadoPerna): number | null {
  const { resumo } = avaliacao;
  if (resumo.tipo === 'agach') {
    return resumo.perdaVelocidadePct === null ? null : PORCENTO - resumo.perdaVelocidadePct;
  }
  if (resumo.lsi) {
    if (resumo.lsi.valor === null) return null;
    return pernaAlvo(resumo, avaliacao.pernaLesionada) === lado ? resumo.lsi.valor : PORCENTO;
  }
  const rsi = resumo.pernas.unica?.rsi ?? null;
  if (PROTOCOLOS[avaliacao.protocolo].dropJump && rsi !== null) {
    return (rsi / RSI_REFERENCIA) * PORCENTO;
  }
  return null;
}

export function explicacaoDaRazao(avaliacao: AvaliacaoParaMelhorias): string {
  const { resumo } = avaliacao;
  if (resumo.tipo === 'agach') {
    return `Razão: velocidade da última repetição ÷ a da melhor (bom a partir de ${PORCENTO - PERDA_LIMITE_VERDE}%).`;
  }
  if (resumo.lsi) {
    const alvo = pernaAlvo(resumo, avaliacao.pernaLesionada);
    const perna = alvo ? `perna ${ROTULO_PERNA[alvo].toLowerCase()}` : 'perna mais fraca';
    const base = resumo.lsi.base === 'rsi' ? 'RSI' : 'altura';
    return `Razão: LSI pela ${base}, ${perna} ÷ outra perna (base 100%; bom a partir de ${LSI_LIMITE_VERDE}%).`;
  }
  if (PROTOCOLOS[avaliacao.protocolo].dropJump) {
    return `Razão: RSI ÷ referência ${fmt(RSI_REFERENCIA, 1)} (bom a partir de 100%).`;
  }
  return 'Razão: este protocolo não tem referência para comparar.';
}

/* Ponto livre (US2) */

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Grupo citado num texto livre, sem acentos e sem diferenciar maiúsculas; null se nenhum. */
export function reconhecerGrupo(texto: string): GrupoMuscular | null {
  const alvo = semAcento(texto);
  const achado = (Object.entries(ROTULO_GRUPO) as [GrupoMuscular, string][]).find(([, nome]) =>
    alvo.includes(semAcento(nome.split(' (')[0])),
  );
  return achado ? achado[0] : null;
}

/** Ponto acrescentado pelo avaliador; o grupo reconhecido entra nas duas pernas. */
export function criarPontoLivre(texto: string): PontoMelhoria {
  const titulo = texto.trim();
  if (titulo === '') throw new Error('Escreva o ponto a acrescentar.');
  const grupo = reconhecerGrupo(titulo);
  return {
    titulo,
    grupos: grupo ? [{ grupo, lado: 'ambas' }] : [],
    motivo: MOTIVO_AVALIADOR,
    foco: '',
    origem: 'avaliador',
  };
}
