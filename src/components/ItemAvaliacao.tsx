import { Pressable, Text, View } from 'react-native';

import { SeloBaixaPrecisao } from '@/components/SeloBaixaPrecisao';
import type { AvaliacaoDoHistorico } from '@/types/assessment';
import type { CorLsi } from '@/types/resultadoSalto';
import { dataHoraParaBr } from '@/utils/datas';
import { PROTOCOLOS } from '@/utils/protocolos';
import { medidaPrincipal } from '@/utils/resumoPerfil';

const COR_TEXTO: Record<CorLsi, string> = {
  verde: 'text-destaque',
  amarelo: 'text-aviso',
  vermelho: 'text-erro',
  neutro: 'text-texto',
};

interface ItemAvaliacaoProps {
  avaliacao: AvaliacaoDoHistorico;
  aoTocar: () => void;
}

/** Uma avaliação do histórico: protocolo, data, selo de baixa precisão e a medida principal. */
export function ItemAvaliacao({ avaliacao, aoTocar }: ItemAvaliacaoProps) {
  const medida = medidaPrincipal(avaliacao);
  const nome = PROTOCOLOS[avaliacao.protocolo].nome;
  const baixaPrecisao = avaliacao.resumo.tipo === 'salto' && avaliacao.resumo.baixaPrecisao;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nome}, ${dataHoraParaBr(avaliacao.dataHora)}`}
      onPress={aoTocar}
      className="flex-row items-center gap-3 rounded-2xl border border-borda bg-cartao p-4"
    >
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-texto">{nome}</Text>
        <Text className="text-xs text-textoSecundario">{dataHoraParaBr(avaliacao.dataHora)}</Text>
        {baixaPrecisao ? <SeloBaixaPrecisao /> : null}
      </View>
      <Text className={`text-base font-bold ${COR_TEXTO[medida.cor ?? 'neutro']}`}>
        {medida.texto}
      </Text>
    </Pressable>
  );
}
