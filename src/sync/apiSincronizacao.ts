import { chamarApi, type ResultadoHttp } from '@/sync/clienteHttp';
import { lerPaginaRecebimento, lerResultadoEnvio } from '@/sync/validacaoRespostas';
import type { PaginaRecebimento, RegistroSync, ResultadoRegistro } from '@/types/sincronizacao';

export const LIMITE_PAGINA = 200;

/** POST /api/sync/enviar: pacientes e avaliações pendentes (até 100 registros). */
export function enviarLote(lote: {
  pacientes: RegistroSync[];
  avaliacoes: RegistroSync[];
}): Promise<ResultadoHttp<ResultadoRegistro[]>> {
  return chamarApi(
    '/api/sync/enviar',
    {
      metodo: 'POST',
      autenticada: true,
      corpo: {
        pacientes: lote.pacientes.map(({ id, atualizadoEm, conteudo }) => ({
          id,
          atualizadoEm,
          conteudo,
        })),
        avaliacoes: lote.avaliacoes.map(({ id, pacienteId, atualizadoEm, conteudo }) => ({
          id,
          pacienteId,
          atualizadoEm,
          conteudo,
        })),
      },
    },
    lerResultadoEnvio,
  );
}

/** GET /api/sync/receber: registros da conta mudados depois do cursor. */
export function receberPagina(desde: number): Promise<ResultadoHttp<PaginaRecebimento>> {
  return chamarApi(
    `/api/sync/receber?desde=${desde}&limite=${LIMITE_PAGINA}`,
    { metodo: 'GET', autenticada: true },
    lerPaginaRecebimento,
  );
}
