import { randomUUID } from 'expo-crypto';

import type { ConexaoBanco } from '@/database/conexao';
import type {
  Assessment,
  AvaliacaoDoHistorico,
  NovaAvaliacao,
  ResumoAvaliacao,
} from '@/types/assessment';
import type { Attempt, NumeroTentativa, PernaTentativa } from '@/types/attempt';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
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
  'id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg, observacoes, resultado_json, criado_em, atualizado_em, pendente_sync';

/** Confere, antes de gravar, o que o banco não enxerga: as tentativas batem com o protocolo. */
function conferirTentativas(nova: NovaAvaliacao) {
  const info = PROTOCOLOS[nova.protocolo];
  if (info.agachamento) {
    throw new Error('A gravação do agachamento com barra chega com a HU014.');
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

/** Grava a avaliação e as tentativas numa única transação. */
export async function salvarAvaliacao(
  db: ConexaoBanco,
  nova: NovaAvaliacao,
  resumo: ResumoAvaliacao,
  observacoes: string,
): Promise<Assessment> {
  conferirTentativas(nova);
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
      `INSERT INTO avaliacao (${COLUNAS_AVALIACAO}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
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
  if (
    !ehObjeto(valor) ||
    valor.versao !== 1 ||
    valor.tipo !== 'salto' ||
    !ehObjeto(valor.pernas) ||
    typeof valor.baixaPrecisao !== 'boolean' ||
    !(valor.lsi === null || ehObjeto(valor.lsi))
  ) {
    throw new Error('Resumo da avaliação em formato desconhecido.');
  }
  return valor as unknown as ResumoAvaliacao;
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
  };
}

/** Avaliações do paciente em ordem crescente de data, sem as tentativas. */
export async function listarAvaliacoesDoPaciente(
  db: ConexaoBanco,
  pacienteId: string,
): Promise<AvaliacaoDoHistorico[]> {
  const linhas = await db.getAllAsync<
    Pick<LinhaAvaliacao, 'id' | 'protocolo' | 'data_hora' | 'perna_lesionada' | 'resultado_json'>
  >(
    `SELECT id, protocolo, data_hora, perna_lesionada, resultado_json FROM avaliacao
      WHERE paciente_id = ? ORDER BY data_hora ASC, criado_em ASC`,
    pacienteId,
  );
  return linhas.map((linha) => ({
    id: linha.id,
    protocolo: linha.protocolo,
    dataHora: linha.data_hora,
    pernaLesionada: linha.perna_lesionada,
    resumo: lerResumo(linha.resultado_json),
  }));
}
