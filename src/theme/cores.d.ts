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
};

export = cores;
