import { Pressable, Text } from 'react-native';

import { RodapeFixo } from '@/components/RodapeFixo';
import type { EventoSalto } from '@/types/attempt';
import { NOME_EVENTO } from '@/utils/marcacoes';
import { ROTULO_PERNA } from '@/utils/rotulos';
import type { PosicaoTentativa } from '@/utils/tentativas';

/** O que o botão principal faz agora (D23, HU007 RN22). */
export type AcaoDoRodape =
  | { tipo: 'marcar'; evento: EventoSalto; quadro: number; liberado: boolean }
  | { tipo: 'proxima'; destino: PosicaoTentativa; outraPerna: boolean }
  | { tipo: 'resultado' };

interface RodapeMarcacaoProps {
  acao: AcaoDoRodape;
  aoMarcar(evento: EventoSalto): void;
  aoIrPara(destino: PosicaoTentativa): void;
  aoVerResultado(): void;
}

function textoDaAcao(acao: AcaoDoRodape): string {
  if (acao.tipo === 'marcar') {
    return acao.liberado
      ? `Marcar ${NOME_EVENTO[acao.evento].toLowerCase()} no quadro ${acao.quadro}`
      : 'Confirme o FPS para marcar';
  }
  if (acao.tipo === 'proxima') {
    const { perna, numero } = acao.destino;
    return acao.outraPerna && perna !== 'unica'
      ? `Ir para a perna ${ROTULO_PERNA[perna].toLowerCase()}, tentativa ${numero}`
      : `Ir para a tentativa ${numero}`;
  }
  return 'Ver resultado';
}

/** Botão principal fixo no rodapé do analisador (D23): marcar, seguir para a próxima ou o resultado. */
export function RodapeMarcacao({ acao, aoMarcar, aoIrPara, aoVerResultado }: RodapeMarcacaoProps) {
  const habilitado = acao.tipo !== 'marcar' || acao.liberado;
  const aoTocar = () => {
    if (acao.tipo === 'marcar') aoMarcar(acao.evento);
    else if (acao.tipo === 'proxima') aoIrPara(acao.destino);
    else aoVerResultado();
  };
  const texto = textoDaAcao(acao);
  return (
    <RodapeFixo>
      <Pressable
        testID="acao-rodape"
        accessibilityRole="button"
        accessibilityLabel={texto}
        accessibilityState={{ disabled: !habilitado }}
        disabled={!habilitado}
        onPress={aoTocar}
        className={`items-center rounded-2xl bg-destaque py-4 ${habilitado ? '' : 'opacity-40'}`}
      >
        <Text className="text-base font-bold text-fundo">{texto}</Text>
      </Pressable>
    </RodapeFixo>
  );
}
