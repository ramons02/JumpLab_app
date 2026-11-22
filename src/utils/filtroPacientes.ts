import type { FiltroPerfil, PacienteNaLista } from '@/types/patient';
import { normalizarTexto } from '@/utils/textos';

const ORDEM_ALFABETICA = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/** Itens do perfil escolhido cujo nome contém a busca, por nome, sem maiúsculas nem acentos. */
export function filtrarPacientes(
  itens: PacienteNaLista[],
  filtro: FiltroPerfil,
  busca: string,
): PacienteNaLista[] {
  const termo = normalizarTexto(busca);
  return itens
    .filter((item) => filtro === 'todos' || item.perfil === filtro)
    .filter((item) => termo === '' || normalizarTexto(item.nome).includes(termo))
    .sort((a, b) => ORDEM_ALFABETICA.compare(a.nome, b.nome));
}
