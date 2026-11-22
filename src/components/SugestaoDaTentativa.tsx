import { PainelSugestao } from '@/components/PainelSugestao';
import { usePreferencias } from '@/hooks/usePreferencias';
import { useSugestaoQuadros } from '@/hooks/useSugestaoQuadros';
import type { NumeroTentativa, PernaTentativa, TentativaEmAndamento } from '@/types/attempt';
import type { Protocol } from '@/types/protocol';

interface SugestaoDaTentativaProps {
  protocolo: Protocol;
  perna: PernaTentativa;
  numero: NumeroTentativa;
  tentativa: TentativaEmAndamento;
  aoIrAoQuadro: (quadro: number) => void;
}

/**
 * Sugestão automática no analisador (spec 018): só com a chave em teste ligada e o FPS confirmado.
 * Fica montada enquanto o analisador está aberto, para a análise ser cancelada ao sair.
 */
export function SugestaoDaTentativa({
  protocolo,
  perna,
  numero,
  tentativa,
  aoIrAoQuadro,
}: SugestaoDaTentativaProps) {
  const { sugestaoLigada } = usePreferencias();
  const { sugestao, progresso, sugerir } = useSugestaoQuadros(perna, numero);
  if (!sugestaoLigada || !tentativa.video || tentativa.fpsConfirmado === null) return null;
  return (
    <PainelSugestao
      protocolo={protocolo}
      sugestao={sugestao}
      progresso={progresso}
      marcas={tentativa.marcas}
      aoSugerir={() => void sugerir()}
      aoIrAoQuadro={aoIrAoQuadro}
    />
  );
}
