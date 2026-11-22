import type { Protocol } from '@/types/protocol';

export type ResultadoConfiguracao =
  { ok: true; cargaKg: number | null } | { ok: false; erro: string };

/** Regras para seguir da configuração da avaliação (HU004). */
export function validarConfiguracao(
  protocolo: Protocol | null,
  // A carga do agachamento entra com a US2
  _cargaTexto: string,
): ResultadoConfiguracao {
  if (!protocolo) return { ok: false, erro: 'Escolha o protocolo.' };
  return { ok: true, cargaKg: null };
}
