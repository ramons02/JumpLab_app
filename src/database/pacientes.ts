import { randomUUID } from 'expo-crypto';

import type { ConexaoBanco } from '@/database/conexao';
import type {
  DadosPaciente,
  PacienteNaLista,
  Patient,
  Perfil,
  PernaLesionada,
} from '@/types/patient';

interface LinhaPaciente {
  id: string;
  nome: string;
  data_nascimento: string;
  perfil: Perfil;
  perna_lesionada: PernaLesionada;
  data_lesao: string | null;
  criado_em: string;
  atualizado_em: string;
}

const COLUNAS =
  'id, nome, data_nascimento, perfil, perna_lesionada, data_lesao, criado_em, atualizado_em';

function paraPaciente(linha: LinhaPaciente): Patient {
  return {
    id: linha.id,
    nome: linha.nome,
    dataNascimento: linha.data_nascimento,
    perfil: linha.perfil,
    pernaLesionada: linha.perna_lesionada,
    dataLesao: linha.data_lesao,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

/** Grava um paciente novo. Quem chama valida antes com `validarPaciente`. */
export async function inserirPaciente(db: ConexaoBanco, dados: DadosPaciente): Promise<Patient> {
  const agora = new Date().toISOString();
  const paciente: Patient = {
    ...dados,
    nome: dados.nome.trim(),
    id: randomUUID(),
    criadoEm: agora,
    atualizadoEm: agora,
  };
  await db.runAsync(
    // Pendente de sincronização até a API confirmar (spec 013).
    `INSERT INTO paciente (${COLUNAS}, pendente_sync) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    paciente.id,
    paciente.nome,
    paciente.dataNascimento,
    paciente.perfil,
    paciente.pernaLesionada,
    paciente.dataLesao,
    paciente.criadoEm,
    paciente.atualizadoEm,
  );
  return paciente;
}

/** Atualiza todos os campos editáveis, mantendo `id` e `criadoEm`. */
export async function atualizarPaciente(
  db: ConexaoBanco,
  id: string,
  dados: DadosPaciente,
): Promise<Patient> {
  const existente = await buscarPaciente(db, id);
  if (!existente) throw new Error('Paciente não encontrado.');

  const atualizado: Patient = {
    ...existente,
    ...dados,
    nome: dados.nome.trim(),
    atualizadoEm: new Date().toISOString(),
  };
  await db.runAsync(
    `UPDATE paciente
        SET nome = ?, data_nascimento = ?, perfil = ?, perna_lesionada = ?, data_lesao = ?, atualizado_em = ?,
            pendente_sync = 1
      WHERE id = ?`,
    atualizado.nome,
    atualizado.dataNascimento,
    atualizado.perfil,
    atualizado.pernaLesionada,
    atualizado.dataLesao,
    atualizado.atualizadoEm,
    id,
  );
  return atualizado;
}

export async function buscarPaciente(db: ConexaoBanco, id: string): Promise<Patient | null> {
  const linha = await db.getFirstAsync<LinhaPaciente>(
    `SELECT ${COLUNAS} FROM paciente WHERE id = ?`,
    id,
  );
  return linha ? paraPaciente(linha) : null;
}

interface LinhaPacienteNaLista extends LinhaPaciente {
  ultima_avaliacao_em: string | null;
}

/**
 * Todos os pacientes com a data da avaliação mais recente de cada um (null sem avaliações).
 * Não ordena nem filtra: isso é de `filtrarPacientes`. `data_hora` é texto AAAA-MM-DDTHH:MM, então o
 * MAX em texto é a mais recente.
 */
export async function listarPacientesComUltimaAvaliacao(
  db: ConexaoBanco,
): Promise<PacienteNaLista[]> {
  const linhas = await db.getAllAsync<LinhaPacienteNaLista>(
    `SELECT p.id, p.nome, p.data_nascimento, p.perfil, p.perna_lesionada, p.data_lesao,
            p.criado_em, p.atualizado_em, MAX(a.data_hora) AS ultima_avaliacao_em
       FROM paciente p
       LEFT JOIN avaliacao a ON a.paciente_id = p.id
      GROUP BY p.id`,
  );
  return linhas.map((linha) => ({
    ...paraPaciente(linha),
    ultimaAvaliacaoEm: linha.ultima_avaliacao_em,
  }));
}
