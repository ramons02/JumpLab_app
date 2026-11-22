import { chamarApi, type ResultadoHttp } from '@/sync/clienteHttp';
import { lerPedidos, lerSenhaTemporariaGerada } from '@/sync/validacaoRespostas';
import type { PedidoRecuperacao, SenhaTemporariaGerada } from '@/types/conta';

/** Caixa de pedidos do administrador (spec 016); conta comum recebe 403 da API. */
export async function listarPedidos(): Promise<ResultadoHttp<PedidoRecuperacao[]>> {
  return chamarApi('/api/admin/pedidos', { metodo: 'GET', autenticada: true }, lerPedidos);
}

export async function gerarSenhaTemporaria(
  pedidoId: number,
): Promise<ResultadoHttp<SenhaTemporariaGerada>> {
  return chamarApi(
    `/api/admin/pedidos/${pedidoId}/senha-temporaria`,
    { metodo: 'POST', autenticada: true },
    lerSenhaTemporariaGerada,
  );
}
