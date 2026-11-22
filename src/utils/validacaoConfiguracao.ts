import type { Protocol } from '@/types/protocol';
import { paraNumeroBr } from '@/utils/numeros';
import { PROTOCOLOS } from '@/utils/protocolos';

export type ResultadoConfiguracao =
  { ok: true; cargaKg: number | null } | { ok: false; erro: string };

/** Regras para seguir da configuração da avaliação (HU004). */
export function validarConfiguracao(
  protocolo: Protocol | null,
  cargaTexto: string,
): ResultadoConfiguracao {
  if (!protocolo) return { ok: false, erro: 'Escolha o protocolo.' };
  if (!PROTOCOLOS[protocolo].agachamento) return { ok: true, cargaKg: null };
  const cargaKg = paraNumeroBr(cargaTexto);
  if (cargaKg === null || cargaKg <= 0) return { ok: false, erro: 'Informe a carga na barra.' };
  return { ok: true, cargaKg };
}
