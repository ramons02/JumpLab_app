import type { CorLsi } from '@/types/resultadoSalto';

/**
 * Classes do semáforo do LSI (D12), com as cores `lsi-*` do tema (spec 007 R7). Também pinta a perda de
 * velocidade do agachamento, que usa o mesmo semáforo.
 */
export const ESTILO_SEMAFORO: Record<CorLsi, { caixa: string; valor: string; barra: string }> = {
  verde: {
    caixa: 'border-lsi-verde bg-lsi-verde-fundo',
    valor: 'text-lsi-verde',
    barra: 'bg-lsi-verde',
  },
  amarelo: {
    caixa: 'border-lsi-amarelo bg-lsi-amarelo-fundo',
    valor: 'text-lsi-amarelo',
    barra: 'bg-lsi-amarelo',
  },
  vermelho: {
    caixa: 'border-lsi-vermelho bg-lsi-vermelho-fundo',
    valor: 'text-lsi-vermelho',
    barra: 'bg-lsi-vermelho',
  },
  neutro: { caixa: 'border-borda bg-cartao', valor: 'text-texto', barra: 'bg-destaque' },
};
