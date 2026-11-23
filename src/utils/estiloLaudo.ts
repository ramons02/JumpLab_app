import cores from '@/theme/cores';

/** CSS do laudo: papel branco, texto escuro e o verde da marca (D16), só com tokens da paleta. */
export function estiloDoLaudo(): string {
  const p = cores.papel;
  return `@page { size: A4; margin: 16mm; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.5; color: ${p.texto}; background: ${p.fundo}; margin: 0; }
header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${p.marcaLinha}; padding-bottom: 8px; }
.identidade { display: flex; align-items: center; gap: 10px; }
.simbolo svg { width: 44px; height: 44px; display: block; }
.avaliador { font-size: 14px; font-weight: bold; color: ${p.marca}; margin: 0; }
p { margin: 0; }
.apoio { color: ${p.textoApoio}; font-size: 10px; }
.secundario { color: ${p.textoSecundario}; font-size: 10px; }
.data { white-space: nowrap; text-align: right; }
.dados { display: grid; grid-template-columns: 1fr 2fr; gap: 2px 12px; margin-top: 12px; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th { background: ${p.faixa}; text-align: left; padding: 4px; }
td { padding: 4px; border-bottom: 1px solid ${p.borda}; }
.numero { text-align: right; }
.nota { margin-top: 8px; }
.lsi { margin-top: 12px; padding: 8px; border-radius: 4px; text-align: center; font-weight: bold; }
.observacoes { margin-top: 12px; }
.evolucao { margin-top: 16px; border-top: 1px solid ${p.borda}; padding-top: 12px; }
.titulo-grafico { font-weight: bold; margin: 8px 0 4px; break-after: avoid; page-break-after: avoid; }
.bloco, tbody, tr { break-inside: avoid; page-break-inside: avoid; }
thead { display: table-header-group; }
.legenda { color: ${p.textoSecundario}; font-size: 9px; }
footer { break-before: avoid; page-break-before: avoid; margin-top: 16px; border-top: 1px solid ${p.borda}; padding-top: 8px; color: ${p.textoSecundario}; font-size: 9px; }`;
}
