import type { EventoSalto, TentativaEmAndamento, TentativasPorPerna } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import type { SerieEmAndamento } from '@/types/squat';
import { repeticaoCompleta } from '@/utils/marcacaoAgachamento';
import { eventosDoProtocolo } from '@/utils/marcacoes';
import { PROTOCOLOS } from '@/utils/protocolos';
import { ROTULO_PERNA } from '@/utils/rotulos';
import { pernasDoProtocolo } from '@/utils/tentativas';

const NOME_DO_EVENTO: Record<EventoSalto, string> = {
  toque: 'toque no solo',
  decolagem: 'decolagem',
  aterrissagem: 'aterrissagem',
};

function oQueFalta(tentativa: TentativaEmAndamento, protocolo: Protocol): string | null {
  if (tentativa.video === null) return 'sem vídeo';
  if (tentativa.fpsConfirmado === null) return 'FPS não confirmado';
  const faltam = eventosDoProtocolo(protocolo).filter((e) => tentativa.marcas[e] === undefined);
  if (faltam.length === 0) return null;
  const nomes = faltam.map((e) => NOME_DO_EVENTO[e]);
  const lista =
    nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
  return `falta marcar ${lista}`;
}

/**
 * O que ainda impede o "Ver resultado" (HU007 RN15), uma linha por tentativa incompleta, na ordem das
 * abas: "Tentativa 2: FPS não confirmado", "Perna esquerda, tentativa 1: falta marcar aterrissagem".
 */
export function pendenciasDaAvaliacao(
  tentativas: TentativasPorPerna,
  protocolo: Protocol,
): string[] {
  const unilateral = PROTOCOLOS[protocolo].unilateral;
  return pernasDoProtocolo(protocolo).flatMap((perna) =>
    (tentativas[perna] ?? []).flatMap((tentativa, indice) => {
      const falta = oQueFalta(tentativa, protocolo);
      if (!falta) return [];
      const qual = unilateral
        ? `Perna ${ROTULO_PERNA[perna as 'direita' | 'esquerda'].toLowerCase()}, tentativa ${indice + 1}`
        : `Tentativa ${indice + 1}`;
      return [`${qual}: ${falta}`];
    }),
  );
}

interface EstadoAgachamento {
  temVideo: boolean;
  fpsConfirmado: number | null;
  cargaKg: number | null;
  serie: SerieEmAndamento;
}

/**
 * O que ainda impede o "Ver resultado" do agachamento (spec 014): vídeo, FPS, carga, calibração pelo
 * disco e ao menos uma repetição com início, fundo e fim. Repetição pela metade não trava.
 */
export function pendenciasDoAgachamento({
  temVideo,
  fpsConfirmado,
  cargaKg,
  serie,
}: EstadoAgachamento): string[] {
  if (!temVideo) return ['sem vídeo'];
  const faltas: string[] = [];
  if (fpsConfirmado === null) faltas.push('FPS não confirmado');
  if (!cargaKg) faltas.push('carga não informada');
  if (!serie.calibracao || serie.calibracao.baseY === null) {
    faltas.push('calibrar o disco (topo e base)');
  }
  if (!serie.repeticoes.some(repeticaoCompleta)) {
    faltas.push('uma repetição completa (início, fundo e fim)');
  }
  return faltas;
}
