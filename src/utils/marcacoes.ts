import type {
  EventoSalto,
  MarcasSalto,
  TentativaEmAndamento,
  TentativasPorPerna,
} from '@/types/attempt';
import type { Protocol } from '@/types/protocol';
import { PROTOCOLOS } from '@/utils/protocolos';

/** Ordem obrigatória dos eventos no tempo (HU007 RN05). */
const ORDEM: readonly EventoSalto[] = ['toque', 'decolagem', 'aterrissagem'];

const ROTULOS_SALTO: Record<EventoSalto, string> = {
  toque: '[Marcar Toque no Solo]',
  decolagem: '[Marcar Decolagem]',
  aterrissagem: '[Marcar Aterrissagem]',
};

const ROTULOS_DROP_JUMP: Record<EventoSalto, string> = {
  toque: '[1. Toque no Solo]',
  decolagem: '[2. Decolagem]',
  aterrissagem: '[3. Aterrissagem Final]',
};

/** Nome com artigo, para montar a frase da recusa. */
const NOME: Record<EventoSalto, { sujeito: string; complemento: string }> = {
  toque: { sujeito: 'o toque no solo', complemento: 'do toque no solo' },
  decolagem: { sujeito: 'a decolagem', complemento: 'da decolagem' },
  aterrissagem: { sujeito: 'a aterrissagem', complemento: 'da aterrissagem' },
};

export function eventosDoProtocolo(protocolo: Protocol): EventoSalto[] {
  return PROTOCOLOS[protocolo].dropJump ? [...ORDEM] : ['decolagem', 'aterrissagem'];
}

export function rotuloDoEvento(evento: EventoSalto, protocolo: Protocol): string {
  return (PROTOCOLOS[protocolo].dropJump ? ROTULOS_DROP_JUMP : ROTULOS_SALTO)[evento];
}

/**
 * Null se o quadro respeita a ordem estrita com as outras marcações; senão, a mensagem de recusa,
 * citando o primeiro evento da ordem que conflita. A marcação anterior do mesmo evento não conta.
 */
export function validarMarcacao(
  marcas: MarcasSalto,
  evento: EventoSalto,
  quadro: number,
): string | null {
  const posicao = ORDEM.indexOf(evento);
  for (const outro of ORDEM) {
    const quadroOutro = marcas[outro];
    if (outro === evento || quadroOutro === undefined) continue;
    const outroVemAntes = ORDEM.indexOf(outro) < posicao;
    const fora = outroVemAntes ? quadro <= quadroOutro : quadro >= quadroOutro;
    if (fora) {
      const relacao = outroVemAntes ? 'depois' : 'antes';
      return `Marcação recusada: ${NOME[evento].sujeito} precisa vir ${relacao} ${NOME[outro].complemento} (quadro ${quadroOutro}).`;
    }
  }
  return null;
}

/** Marca o evento no quadro, substituindo a marcação anterior dele. */
export function aplicarMarcacao(
  marcas: MarcasSalto,
  evento: EventoSalto,
  quadro: number,
): MarcasSalto {
  return { ...marcas, [evento]: quadro };
}

/** FPS confirmado e todos os eventos do protocolo marcados. */
export function tentativaCompleta(tentativa: TentativaEmAndamento, protocolo: Protocol): boolean {
  return (
    tentativa.fpsConfirmado !== null &&
    eventosDoProtocolo(protocolo).every((evento) => tentativa.marcas[evento] !== undefined)
  );
}

/** As três tentativas de cada perna completas (HU007 RN15); sem tentativas, falso. */
export function todasCompletas(tentativas: TentativasPorPerna, protocolo: Protocol): boolean {
  const listas = Object.values(tentativas);
  return (
    listas.length > 0 &&
    listas.every((lista) => (lista ?? []).every((t) => tentativaCompleta(t, protocolo)))
  );
}

/* Tela de marcação guiada (D23, HU007 RN19 a RN23). */

/** Nome do evento para o passo guiado, o botão do rodapé e o selo do vídeo. */
export const NOME_EVENTO: Record<EventoSalto, string> = {
  toque: 'Toque no solo',
  decolagem: 'Decolagem',
  aterrissagem: 'Aterrissagem',
};

/** Letra do evento na barra de progresso e no selo do vídeo. */
export const LETRA_EVENTO: Record<EventoSalto, string> = {
  toque: 'T',
  decolagem: 'D',
  aterrissagem: 'A',
};

/** Qual quadro procurar para cada evento (passo guiado). */
export const DICA_EVENTO: Record<EventoSalto, string> = {
  toque: 'Pare no primeiro quadro com o pé no chão depois da queda da caixa.',
  decolagem: 'Pare no último quadro com o pé ainda no chão.',
  aterrissagem: 'Pare no primeiro quadro com o pé de volta no chão.',
};

/** Primeiro evento do protocolo, na ordem, ainda não marcado; null com todos marcados. */
export function proximoEvento(marcas: MarcasSalto, protocolo: Protocol): EventoSalto | null {
  return eventosDoProtocolo(protocolo).find((evento) => marcas[evento] === undefined) ?? null;
}

/** Texto do selo do evento marcado no quadro (ex.: `D · decolagem`); null se nenhum foi marcado nele. */
export function seloDoQuadro(
  marcas: MarcasSalto,
  protocolo: Protocol,
  quadro: number,
): string | null {
  const evento = eventosDoProtocolo(protocolo).find((e) => marcas[e] === quadro);
  return evento ? `${LETRA_EVENTO[evento]} · ${NOME_EVENTO[evento].toLowerCase()}` : null;
}
