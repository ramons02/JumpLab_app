import { randomUUID } from 'expo-crypto';

import type { ConexaoBanco } from '@/database/conexao';
import type {
  Assessment,
  AvaliacaoDoHistorico,
  NovaAvaliacao,
  ResumoAvaliacao,
} from '@/types/assessment';
import type { Attempt, NumeroTentativa, PernaTentativa } from '@/types/attempt';
import type { PontoMelhoria } from '@/types/melhoria';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import type { MarcasRepeticao, SquatSeries } from '@/types/squat';
import { repeticaoCompleta } from '@/utils/marcacaoAgachamento';
import { PROTOCOLOS } from '@/utils/protocolos';
import { pernasDoProtocolo, TENTATIVAS_POR_PERNA } from '@/utils/tentativas';

interface LinhaAvaliacao {
  id: string;
  paciente_id: string;
  protocolo: Protocol;
  data_hora: string;
  perna_lesionada: PernaLesionada;
  carga_kg: number | null;
  observacoes: string;
  resultado_json: string;
  criado_em: string;
  atualizado_em: string;
  pendente_sync: number;
  melhorias_json: string | null;
}

interface LinhaTentativa {
  perna: PernaTentativa;
  numero: NumeroTentativa;
  fps: number;
  quadro_toque: number | null;
  quadro_decolagem: number;
  quadro_aterrissagem: number;
}

const COLUNAS_AVALIACAO =
  'id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg, observacoes, resultado_json, criado_em, atualizado_em, pendente_sync, melhorias_json';

/** Confere, antes de gravar, o que o banco não enxerga: tentativas e série batem com o protocolo. */
function conferirAvaliacao(nova: NovaAvaliacao) {
  const info = PROTOCOLOS[nova.protocolo];
  if (info.agachamento) {
    conferirSerie(nova);
    return;
  }
  if (nova.serie !== null) {
    throw new Error('Só o agachamento com barra tem série de repetições.');
  }
  for (const perna of pernasDoProtocolo(nova.protocolo)) {
    const numeros = nova.tentativas
      .filter((t) => t.perna === perna)
      .map((t) => t.numero)
      .sort();
    if (numeros.join() !== '1,2,3' || numeros.length !== TENTATIVAS_POR_PERNA) {
      throw new Error(`A perna ${perna} precisa das tentativas 1, 2 e 3.`);
    }
  }
  const pernasValidas = new Set<PernaTentativa>(pernasDoProtocolo(nova.protocolo));
  for (const tentativa of nova.tentativas) {
    if (!pernasValidas.has(tentativa.perna)) {
      throw new Error(`A perna ${tentativa.perna} não faz parte deste protocolo.`);
    }
    if (info.dropJump !== (tentativa.quadroToque !== null)) {
      throw new Error(
        info.dropJump
          ? 'O Drop Jump precisa do quadro do toque.'
          : 'Só o Drop Jump marca o quadro do toque.',
      );
    }
  }
}

/** Agachamento: série com repetições completas, cada uma depois do fim da anterior. */
function conferirSerie(nova: NovaAvaliacao) {
  const { serie } = nova;
  if (!serie || nova.cargaKg === null) {
    throw new Error('O agachamento precisa da série marcada e da carga.');
  }
  if (nova.tentativas.length > 0) {
    throw new Error('O agachamento não tem tentativas de salto.');
  }
  if (serie.repeticoes.length === 0 || !serie.repeticoes.every(repeticaoCompleta)) {
    throw new Error('A série precisa de repetições completas.');
  }
  serie.repeticoes.forEach((r, i) => {
    const anterior = serie.repeticoes[i - 1];
    if (anterior?.fim && r.inicio && r.inicio.quadro <= anterior.fim.quadro) {
      throw new Error('Cada repetição precisa começar depois do fim da anterior.');
    }
  });
}

async function gravarSerie(db: ConexaoBanco, avaliacaoId: string, serie: SquatSeries) {
  await db.runAsync(
    'INSERT INTO serie_agachamento (avaliacao_id, fps, calib_topo_y, calib_base_y) VALUES (?, ?, ?, ?)',
    avaliacaoId,
    serie.fps,
    serie.calibracao.topoY,
    serie.calibracao.baseY,
  );
  for (const [indice, { inicio, fundo, fim }] of serie.repeticoes.entries()) {
    if (!inicio || !fundo || !fim) continue;
    await db.runAsync(
      `INSERT INTO repeticao (avaliacao_id, numero, inicio_quadro, inicio_y, fundo_quadro, fundo_y,
         fim_quadro, fim_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      avaliacaoId,
      indice + 1,
      inicio.quadro,
      inicio.y,
      fundo.quadro,
      fundo.y,
      fim.quadro,
      fim.y,
    );
  }
}

/** Grava a avaliação e as tentativas numa única transação. */
export async function salvarAvaliacao(
  db: ConexaoBanco,
  nova: NovaAvaliacao,
  resumo: ResumoAvaliacao,
  observacoes: string,
): Promise<Assessment> {
  conferirAvaliacao(nova);
  const agora = new Date().toISOString();
  const avaliacao: Assessment = {
    ...nova,
    id: randomUUID(),
    observacoes: observacoes.trim(),
    resumo,
    criadoEm: agora,
    atualizadoEm: agora,
    pendenteSync: true,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO avaliacao (${COLUNAS_AVALIACAO}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      avaliacao.id,
      avaliacao.pacienteId,
      avaliacao.protocolo,
      avaliacao.dataHora,
      avaliacao.pernaLesionada,
      avaliacao.cargaKg,
      avaliacao.observacoes,
      JSON.stringify(resumo),
      avaliacao.criadoEm,
      avaliacao.atualizadoEm,
      avaliacao.melhorias === null ? null : JSON.stringify(avaliacao.melhorias),
    );
    for (const t of avaliacao.tentativas) {
      await db.runAsync(
        `INSERT INTO tentativa (avaliacao_id, perna, numero, fps, quadro_toque, quadro_decolagem,
           quadro_aterrissagem) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        avaliacao.id,
        t.perna,
        t.numero,
        t.fps,
        t.quadroToque,
        t.quadroDecolagem,
        t.quadroAterrissagem,
      );
    }
    if (avaliacao.serie) await gravarSerie(db, avaliacao.id, avaliacao.serie);
  });
  return avaliacao;
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Lê o resultado_json; um formato desconhecido é defeito e sobe como erro (data-model da spec 008). */
export function lerResumo(texto: string): ResumoAvaliacao {
  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch {
    throw new Error('Resumo da avaliação ilegível.');
  }
  if (!ehObjeto(valor) || valor.versao !== 1) {
    throw new Error('Resumo da avaliação em formato desconhecido.');
  }
  const salto =
    valor.tipo === 'salto' &&
    ehObjeto(valor.pernas) &&
    typeof valor.baixaPrecisao === 'boolean' &&
    (valor.lsi === null || ehObjeto(valor.lsi));
  const agachamento =
    valor.tipo === 'agach' &&
    Array.isArray(valor.repeticoes) &&
    typeof valor.cargaKg === 'number' &&
    typeof valor.fps === 'number' &&
    typeof valor.melhorVelocidadeMs === 'number' &&
    typeof valor.melhorPotenciaW === 'number' &&
    (valor.perdaVelocidadePct === null || typeof valor.perdaVelocidadePct === 'number');
  if (!salto && !agachamento) {
    throw new Error('Resumo da avaliação em formato desconhecido.');
  }
  return valor as unknown as ResumoAvaliacao;
}

/** Lê melhorias_json; nulo nas avaliações antigas; formato desconhecido é defeito e sobe como erro. */
export function lerMelhorias(texto: string | null): PontoMelhoria[] | null {
  if (texto === null) return null;
  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch {
    throw new Error('Pontos de melhoria ilegíveis.');
  }
  const valido =
    Array.isArray(valor) &&
    valor.every(
      (p) =>
        ehObjeto(p) &&
        typeof p.titulo === 'string' &&
        Array.isArray(p.grupos) &&
        typeof p.motivo === 'string' &&
        typeof p.foco === 'string',
    );
  if (!valido) throw new Error('Pontos de melhoria em formato desconhecido.');
  return valor as PontoMelhoria[];
}

function paraTentativa(linha: LinhaTentativa): Attempt {
  return {
    perna: linha.perna,
    numero: linha.numero,
    fps: linha.fps,
    quadroToque: linha.quadro_toque,
    quadroDecolagem: linha.quadro_decolagem,
    quadroAterrissagem: linha.quadro_aterrissagem,
  };
}

export async function buscarAvaliacao(db: ConexaoBanco, id: string): Promise<Assessment | null> {
  const linha = await db.getFirstAsync<LinhaAvaliacao>(
    `SELECT ${COLUNAS_AVALIACAO} FROM avaliacao WHERE id = ?`,
    id,
  );
  if (!linha) return null;
  const tentativas = await db.getAllAsync<LinhaTentativa>(
    `SELECT perna, numero, fps, quadro_toque, quadro_decolagem, quadro_aterrissagem
       FROM tentativa WHERE avaliacao_id = ? ORDER BY perna, numero`,
    id,
  );
  return {
    id: linha.id,
    pacienteId: linha.paciente_id,
    protocolo: linha.protocolo,
    dataHora: linha.data_hora,
    pernaLesionada: linha.perna_lesionada,
    cargaKg: linha.carga_kg,
    observacoes: linha.observacoes,
    resumo: lerResumo(linha.resultado_json),
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
    pendenteSync: linha.pendente_sync === 1,
    tentativas: tentativas.map(paraTentativa),
    serie: linha.protocolo === 'agach' ? await lerSerie(db, id) : null,
    melhorias: lerMelhorias(linha.melhorias_json),
  };
}

interface LinhaSerie {
  fps: number;
  calib_topo_y: number;
  calib_base_y: number;
}

interface LinhaRepeticao {
  inicio_quadro: number;
  inicio_y: number;
  fundo_quadro: number;
  fundo_y: number;
  fim_quadro: number;
  fim_y: number;
}

async function lerSerie(db: ConexaoBanco, avaliacaoId: string): Promise<SquatSeries | null> {
  const serie = await db.getFirstAsync<LinhaSerie>(
    'SELECT fps, calib_topo_y, calib_base_y FROM serie_agachamento WHERE avaliacao_id = ?',
    avaliacaoId,
  );
  if (!serie) return null;
  const repeticoes = await db.getAllAsync<LinhaRepeticao>(
    `SELECT inicio_quadro, inicio_y, fundo_quadro, fundo_y, fim_quadro, fim_y
       FROM repeticao WHERE avaliacao_id = ? ORDER BY numero`,
    avaliacaoId,
  );
  return {
    fps: serie.fps,
    calibracao: { topoY: serie.calib_topo_y, baseY: serie.calib_base_y },
    repeticoes: repeticoes.map((r): MarcasRepeticao => ({
      inicio: { quadro: r.inicio_quadro, y: r.inicio_y },
      fundo: { quadro: r.fundo_quadro, y: r.fundo_y },
      fim: { quadro: r.fim_quadro, y: r.fim_y },
    })),
  };
}

/** Avaliações do paciente em ordem crescente de data, sem as tentativas. */
export async function listarAvaliacoesDoPaciente(
  db: ConexaoBanco,
  pacienteId: string,
): Promise<AvaliacaoDoHistorico[]> {
  const linhas = await db.getAllAsync<
    Pick<
      LinhaAvaliacao,
      | 'id'
      | 'paciente_id'
      | 'protocolo'
      | 'data_hora'
      | 'perna_lesionada'
      | 'resultado_json'
      | 'melhorias_json'
    >
  >(
    `SELECT id, paciente_id, protocolo, data_hora, perna_lesionada, resultado_json, melhorias_json FROM avaliacao
      WHERE paciente_id = ? ORDER BY data_hora ASC, criado_em ASC`,
    pacienteId,
  );
  return linhas.map((linha) => ({
    id: linha.id,
    pacienteId: linha.paciente_id,
    protocolo: linha.protocolo,
    dataHora: linha.data_hora,
    pernaLesionada: linha.perna_lesionada,
    resumo: lerResumo(linha.resultado_json),
    melhorias: lerMelhorias(linha.melhorias_json),
  }));
}
