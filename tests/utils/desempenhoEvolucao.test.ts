import type { Protocol } from '@/types/protocol';
import { montarGraficoLsi, montarGraficoProtocolo, protocolosAvaliados } from '@/utils/evolucao';

import { agachamento, lsi, perna, salto } from '../helpers/historicoDoLaudo';

const LIMITE_MS = 100;

it('100 avaliações variadas viram gráficos em menos de 100 ms', () => {
  const protocolos: Protocol[] = ['cmj_bi', 'cmj_uni', 'sj', 'dj', 'dj_uni', 'agach'];
  const historico = Array.from({ length: 100 }, (_, i) => {
    const protocolo = protocolos[i % protocolos.length];
    const data = `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}T10:00`;
    if (protocolo === 'agach') return agachamento(data, 0.9);
    const pernas = protocolo.endsWith('uni')
      ? { direita: perna(20, { rsi: 1 }), esquerda: perna(22, { rsi: 1.1 }) }
      : { unica: perna(30, { rsi: 1.2 }) };
    return salto(protocolo, data, pernas, {
      lsi: protocolo.endsWith('uni') ? lsi(90, 'altura') : null,
    });
  });

  const inicio = performance.now();
  for (const p of protocolosAvaliados(historico)) montarGraficoProtocolo(p, historico, 'direita');
  montarGraficoLsi(historico);

  expect(performance.now() - inicio).toBeLessThan(LIMITE_MS);
});
