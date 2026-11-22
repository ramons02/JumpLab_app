/**
 * Paleta única do app (tema escuro com destaque verde, D16), com os valores do protótipo validado.
 * Lida pelo tailwind.config.js (classes do NativeWind) e importada onde a cor precisa ser valor
 * (react-native-svg, navegação). Nenhum outro arquivo define cor em hexadecimal.
 */
module.exports = {
  fundo: '#0b0f0e',
  cartao: '#121816',
  borda: '#263130',
  texto: '#f1f5f3',
  textoSecundario: '#93a29b',
  destaque: '#2ee58a',
  destaqueFundo: '#13361f',
  aviso: { DEFAULT: '#f8c867', fundo: '#2b2210' },
  erro: { DEFAULT: '#f87171', fundo: '#2c1414' },
  // linha guia vertical do analisador (amarelo do protótipo, spec 006)
  guia: '#fde047',
  personagem: {
    pele: '#e8b48a',
    peleFundo: '#c8936b',
    cabelo: '#1c2220',
    camiseta: '#2ee58a',
    camisetaFundo: '#1fb56b',
    camisetaLetra: '#0b3d25',
    short: '#26322e',
    tenis: '#f1f5f3',
    sola: '#2ee58a',
    meia: '#f1f5f3',
    olho: '#1c2220',
    boca: '#8a4b2f',
    sombra: 'rgba(0,0,0,0.45)',
    brilho: 'rgba(46,229,138,0.22)',
    anilhaFundo: '#151b19',
    anilhaBorda: '#94a3b8',
    barra: '#cbd5e1',
  },
  // Mapa muscular do "O que melhorar" (spec 017, research R3b): vermelho melhorar, verde ok
  mapa: {
    melhorar: { fundo: '#c4300f', fibra: '#8a1c06' },
    ok: { fundo: '#2f9e57', fibra: '#1d6b3a' },
    neutro: { fundo: '#4a5551', fibra: '#5d6a65' },
    corpo: '#323c39',
    contorno: '#4c5853',
    marcador: '#d8e0dd',
    numero: '#1b2321',
    texto: '#aebbb5',
    alerta: '#f87171',
  },
  marca: { fundoIcone: '#1b1b1b' },
  // laudo em PDF: papel branco com o verde da marca (spec 010, D16), valores da classe .papel do protótipo
  papel: {
    fundo: '#ffffff',
    texto: '#1f2937',
    textoSecundario: '#64748b',
    textoApoio: '#475569',
    faixa: '#f1f5f9',
    borda: '#e2e8f0',
    marca: '#15803d',
    marcaLinha: '#16a34a',
    lsi: {
      verde: { fundo: '#ecfdf3', texto: '#15803d' },
      amarelo: { fundo: '#fffbeb', texto: '#b45309' },
      vermelho: { fundo: '#fef2f2', texto: '#b91c1c' },
      neutro: { fundo: '#f8fafc', texto: '#475569' },
    },
    // mapa muscular no papel (spec 017): mesmas cores de melhorar e ok, neutros claros
    mapa: {
      melhorar: { fundo: '#c4300f', fibra: '#8a1c06' },
      ok: { fundo: '#2f9e57', fibra: '#1d6b3a' },
      neutro: { fundo: '#d5d9dd', fibra: '#b3bac1' },
      corpo: '#eceef0',
      contorno: '#c9cfd4',
      marcador: '#3d4a46',
      numero: '#ffffff',
      texto: '#475569',
      alerta: '#b42318',
    },
  },
  // linhas dos gráficos de evolução (spec 009), valores do protótipo
  grafico: {
    unica: '#2ee58a',
    direita: '#2ee58a',
    esquerda: '#94a3b8',
    lsiAltura: '#2ee58a',
    lsiRsi: '#9333ea',
    referencia: '#16a34a',
    eixo: '#93a29b',
  },
};
