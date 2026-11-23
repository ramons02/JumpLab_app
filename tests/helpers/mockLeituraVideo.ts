import type { DadosDoVideo } from '../../modules/leitura-video';

/**
 * Módulo `leitura-video` simulado (registrado no jest.config.js). Por padrão não lê nada, e a taxa vem
 * do tocador; cada teste pode definir `dadosDoVideo` ou fazer a leitura falhar.
 */
export const leituraVideo: { dados: DadosDoVideo | null; falhar: boolean } = {
  dados: null,
  falhar: false,
};

export function reiniciarLeituraVideo() {
  leituraVideo.dados = null;
  leituraVideo.falhar = false;
}

export const lerDadosDoVideo = jest.fn(async (): Promise<DadosDoVideo> => {
  if (leituraVideo.falhar) throw new Error('VIDEO_ILEGIVEL');
  return (
    leituraVideo.dados ?? { taxaDeCaptura: null, quadros: null, duracaoS: null, taxaDaFaixa: null }
  );
});
