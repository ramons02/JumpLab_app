/**
 * expo-print e expo-sharing simulados: guardam o HTML recebido e a URI compartilhada. Uso:
 * jest.mock('expo-print', () => require('../helpers/mocksLaudo').moduloPrint);
 * jest.mock('expo-sharing', () => require('../helpers/mocksLaudo').moduloSharing);
 */
export const laudo = {
  htmls: [] as string[],
  compartilhados: [] as { uri: string; opcoes: unknown }[],
  falharAoGerar: false,
  compartilhamentoDisponivel: true,
  /** Promessa que o teste resolve para segurar a geração (toque duplo). */
  segurar: null as Promise<void> | null,
};

export function reiniciarLaudo() {
  laudo.htmls = [];
  laudo.compartilhados = [];
  laudo.falharAoGerar = false;
  laudo.compartilhamentoDisponivel = true;
  laudo.segurar = null;
}

export const moduloPrint = {
  printToFileAsync: jest.fn(async ({ html }: { html: string }) => {
    if (laudo.segurar) await laudo.segurar;
    if (laudo.falharAoGerar) throw new Error('falha ao gerar');
    laudo.htmls.push(html);
    return { uri: `file:///cache/Print/laudo-${laudo.htmls.length}.pdf`, numberOfPages: 1 };
  }),
};

export const moduloSharing = {
  isAvailableAsync: jest.fn(async () => laudo.compartilhamentoDisponivel),
  shareAsync: jest.fn(async (uri: string, opcoes: unknown) => {
    laudo.compartilhados.push({ uri, opcoes });
  }),
};
