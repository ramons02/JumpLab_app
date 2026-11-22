import type { Perfil, PernaLesionada } from '@/types/patient';

export const ROTULO_PERFIL: Record<Perfil, string> = {
  pos_lca: 'Pós-LCA',
  corredor: 'Corredor',
};

export const ROTULO_PERNA: Record<PernaLesionada, string> = {
  direita: 'Direita',
  esquerda: 'Esquerda',
  nenhuma: 'Nenhuma',
};
