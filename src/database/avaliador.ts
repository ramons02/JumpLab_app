import type { ConexaoBanco } from '@/database/conexao';
import type { Avaliador } from '@/types/avaliador';

const ID_UNICO = 1;
const AVALIADOR_VAZIO: Avaliador = { nome: '', registro: '' };

/** O avaliador do aparelho; tudo vazio se ainda não foi configurado. */
export async function buscarAvaliador(db: ConexaoBanco): Promise<Avaliador> {
  const linha = await db.getFirstAsync<Avaliador>(
    'SELECT nome, registro FROM avaliador WHERE id = ?',
    ID_UNICO,
  );
  return linha ? { nome: linha.nome, registro: linha.registro } : { ...AVALIADOR_VAZIO };
}

/** Grava a linha única do avaliador, sem espaços nas pontas. */
export async function salvarAvaliador(db: ConexaoBanco, dados: Avaliador): Promise<Avaliador> {
  const avaliador = { nome: dados.nome.trim(), registro: dados.registro.trim() };
  await db.runAsync(
    `INSERT INTO avaliador (id, nome, registro, atualizado_em) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, registro = excluded.registro,
       atualizado_em = excluded.atualizado_em`,
    ID_UNICO,
    avaliador.nome,
    avaliador.registro,
    new Date().toISOString(),
  );
  return avaliador;
}
