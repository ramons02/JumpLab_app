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
