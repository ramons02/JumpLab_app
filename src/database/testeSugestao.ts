import type { ConexaoBanco } from '@/database/conexao';
import type { Protocol } from '@/types/protocol';
import type { ParSugeridoMarcado } from '@/utils/resumoTesteSugestao';

interface LinhaPar {
  protocolo: Protocol;
  quadro_toque: number | null;
  quadro_decolagem: number;
  quadro_aterrissagem: number;
  quadro_sugerido_toque: number | null;
  quadro_sugerido_decolagem: number | null;
  quadro_sugerido_aterrissagem: number | null;
}

/** Cada evento das avaliações salvas que tem quadro sugerido e marcado, com o protocolo (spec 018). */
export async function listarParesSugeridoMarcado(db: ConexaoBanco): Promise<ParSugeridoMarcado[]> {
  const linhas = await db.getAllAsync<LinhaPar>(
    `SELECT a.protocolo, t.quadro_toque, t.quadro_decolagem, t.quadro_aterrissagem,
            t.quadro_sugerido_toque, t.quadro_sugerido_decolagem, t.quadro_sugerido_aterrissagem
       FROM tentativa t JOIN avaliacao a ON a.id = t.avaliacao_id
      WHERE t.quadro_sugerido_toque IS NOT NULL
         OR t.quadro_sugerido_decolagem IS NOT NULL
         OR t.quadro_sugerido_aterrissagem IS NOT NULL
      ORDER BY a.data_hora, t.perna, t.numero`,
  );
  return linhas.flatMap((l) => {
    const eventos: [number | null, number | null][] = [
      [l.quadro_sugerido_toque, l.quadro_toque],
      [l.quadro_sugerido_decolagem, l.quadro_decolagem],
      [l.quadro_sugerido_aterrissagem, l.quadro_aterrissagem],
    ];
    return eventos.flatMap(([sugerido, marcado]) =>
      sugerido === null || marcado === null ? [] : [{ protocolo: l.protocolo, sugerido, marcado }],
    );
  });
}
