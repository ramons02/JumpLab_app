import { gravarSessao } from '@/sync/armazenamentoSessao';
import { contemChaveDeVideo } from '@/sync/serializacao';

/**
 * API de sincronização simulada em memória, com as regras do contrato da spec 013: vence a alteração
 * mais recente, versão crescente compartilhada, isolamento por conta, lote até 100 e recusa de vídeo.
 * O token de acesso é "token-<email>".
 */
interface Guardado {
  tipo: 'paciente' | 'avaliacao';
  id: string;
  pacienteId?: string;
  atualizadoEm: string;
  conteudo: unknown;
  versao: number;
  dono: string;
}

type Falha = 'rede' | 401 | 500;

export const URL_API = 'http://api.teste';

export function criarServidorSync() {
  const registros = new Map<string, Guardado>();
  const falhas: { rota: 'enviar' | 'receber' | 'renovar'; falha: Falha; pular: number }[] = [];
  let versao = 0;
  const chamadas: { rota: string; corpo: unknown }[] = [];

  const resposta = (status: number, corpo: unknown) =>
    ({
      status,
      ok: status >= 200 && status < 300,
      text: async () => JSON.stringify(corpo),
    }) as Response;

  function proximaFalha(rota: 'enviar' | 'receber' | 'renovar'): Falha | null {
    const i = falhas.findIndex((f) => f.rota === rota);
    if (i < 0) return null;
    if (falhas[i].pular > 0) {
      falhas[i].pular -= 1;
      return null;
    }
    return falhas.splice(i, 1)[0].falha;
  }

  function enviar(dono: string, lote: { pacientes?: Guardado[]; avaliacoes?: Guardado[] }) {
    const pacientes = lote.pacientes ?? [];
    const avaliacoes = lote.avaliacoes ?? [];
    if (pacientes.length + avaliacoes.length > 100) {
      return resposta(400, {
        sucesso: false,
        mensagem: 'O lote passa do limite de 100 registros.',
      });
    }
    const resultados = [
      ...pacientes.map((r) => gravar(dono, 'paciente', r)),
      ...avaliacoes.map((r) => gravar(dono, 'avaliacao', r)),
    ];
    return resposta(200, { sucesso: true, dados: { resultados } });
  }

  function gravar(dono: string, tipo: 'paciente' | 'avaliacao', r: Guardado) {
    const base = { tipo, id: r.id };
    if (contemChaveDeVideo(r.conteudo))
      return { ...base, situacao: 'recusado', motivo: 'Vídeo não é sincronizado.' };
    if (tipo === 'avaliacao') {
      const paciente = registros.get(`paciente:${r.pacienteId}`);
      if (!paciente || paciente.dono !== dono) {
        return { ...base, situacao: 'recusado', motivo: 'Paciente não encontrado na conta.' };
      }
    }
    const atual = registros.get(`${tipo}:${r.id}`);
    if (atual && atual.dono !== dono)
      return { ...base, situacao: 'recusado', motivo: 'Registro não pertence à conta.' };
    if (atual && Date.parse(r.atualizadoEm) <= Date.parse(atual.atualizadoEm)) {
      return { ...base, situacao: 'ignorado', motivo: null };
    }
    versao += 1;
    registros.set(`${tipo}:${r.id}`, {
      ...r,
      tipo,
      versao,
      dono,
      conteudo: JSON.parse(JSON.stringify(r.conteudo)),
    });
    return { ...base, situacao: 'aceito', motivo: null };
  }

  function receber(dono: string, desde: number, limite: number) {
    const todos = [...registros.values()]
      .filter((r) => r.dono === dono && r.versao > desde)
      .sort((a, b) => a.versao - b.versao);
    const pagina = todos.slice(0, limite);
    const paraDto = ({ id, pacienteId, atualizadoEm, conteudo }: Guardado) => ({
      id,
      pacienteId,
      atualizadoEm,
      conteudo,
    });
    return resposta(200, {
      sucesso: true,
      dados: {
        pacientes: pagina.filter((r) => r.tipo === 'paciente').map(paraDto),
        avaliacoes: pagina.filter((r) => r.tipo === 'avaliacao').map(paraDto),
        cursor: pagina.length ? pagina[pagina.length - 1].versao : desde,
        temMais: todos.length > limite,
      },
    });
  }

  const fetchFalso = jest.fn(async (url: RequestInfo | URL, init: RequestInit = {}) => {
    const endereco = new URL(String(url));
    const token = (init.headers as Record<string, string> | undefined)?.Authorization?.replace(
      'Bearer ',
      '',
    );
    const dono = token?.startsWith('token-') ? token.slice('token-'.length) : null;
    const corpo = init.body ? JSON.parse(String(init.body)) : undefined;
    chamadas.push({ rota: endereco.pathname, corpo });

    const rota = endereco.pathname.split('/').pop() as 'enviar' | 'receber' | 'renovar';
    const falha = proximaFalha(rota);
    if (falha === 'rede') throw new TypeError('Network request failed');
    if (falha !== null) return resposta(falha, { sucesso: false, mensagem: 'Falha simulada.' });
    if (endereco.pathname === '/api/auth/renovar') return resposta(401, { sucesso: false });
    if (!dono) return resposta(401, { sucesso: false, mensagem: 'Sessão inválida ou expirada.' });
    if (endereco.pathname === '/api/sync/enviar') return enviar(dono, corpo);
    if (endereco.pathname === '/api/sync/receber') {
      return receber(
        dono,
        Number(endereco.searchParams.get('desde')),
        Number(endereco.searchParams.get('limite')),
      );
    }
    return resposta(404, { sucesso: false });
  });

  return {
    registros,
    chamadas,
    instalar() {
      process.env.EXPO_PUBLIC_API_URL = URL_API;
      global.fetch = fetchFalso as unknown as typeof fetch;
    },
    /** A próxima chamada da rota falha; com `pular`, deixa passar antes as primeiras chamadas. */
    falhar(rota: 'enviar' | 'receber' | 'renovar', falha: Falha, pular = 0) {
      falhas.push({ rota, falha, pular });
    },
    /** Lotes enviados (só as chamadas a /api/sync/enviar). */
    lotes() {
      return chamadas
        .filter((c) => c.rota === '/api/sync/enviar')
        .map((c) => c.corpo as { pacientes: unknown[]; avaliacoes: unknown[] });
    },
  };
}

export async function entrarComo(email: string) {
  await gravarSessao({
    tokenAcesso: `token-${email}`,
    tokenRenovacao: `renovacao-${email}`,
    conta: { nome: 'Teste', email, admin: false, trocaSenhaObrigatoria: false },
  });
}
