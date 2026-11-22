import { BlocoAgachamento } from '@/components/BlocoAgachamento';
import { BlocoSalto } from '@/components/BlocoSalto';
import type { ResumoAvaliacao } from '@/types/assessment';
import type { PernaLesionada } from '@/types/patient';
import type { Protocol } from '@/types/protocol';

/** Bloco do resultado conforme o tipo do resumo: salto ou agachamento. */
export function BlocoResultado(props: {
  protocolo: Protocol;
  pernaLesionada: PernaLesionada;
  resumo: ResumoAvaliacao;
}) {
  if (props.resumo.tipo === 'agach') return <BlocoAgachamento resumo={props.resumo} />;
  return (
    <BlocoSalto
      protocolo={props.protocolo}
      pernaLesionada={props.pernaLesionada}
      resumo={props.resumo}
    />
  );
}
