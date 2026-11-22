interface CoresPersonagem {
  pele: string;
  peleFundo: string;
  cabelo: string;
  camiseta: string;
  camisetaFundo: string;
  camisetaLetra: string;
  short: string;
  tenis: string;
  sola: string;
  meia: string;
  olho: string;
  boca: string;
  sombra: string;
  brilho: string;
  anilhaFundo: string;
  anilhaBorda: string;
  barra: string;
}

interface CorDoPapel {
  fundo: string;
  texto: string;
}

interface CoresPapel {
  fundo: string;
  texto: string;
  textoSecundario: string;
  textoApoio: string;
  faixa: string;
  borda: string;
  marca: string;
  marcaLinha: string;
  lsi: { verde: CorDoPapel; amarelo: CorDoPapel; vermelho: CorDoPapel; neutro: CorDoPapel };
}

interface CoresGrafico {
  unica: string;
  direita: string;
  esquerda: string;
  lsiAltura: string;
  lsiRsi: string;
  referencia: string;
  eixo: string;
}

declare const cores: {
  fundo: string;
  cartao: string;
  borda: string;
  texto: string;
  textoSecundario: string;
  destaque: string;
  destaqueFundo: string;
  aviso: { DEFAULT: string; fundo: string };
  erro: { DEFAULT: string; fundo: string };
  personagem: CoresPersonagem;
  marca: { fundoIcone: string };
  papel: CoresPapel;
  grafico: CoresGrafico;
};

export = cores;
