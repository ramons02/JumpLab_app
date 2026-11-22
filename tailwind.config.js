const cores = require('./src/theme/cores');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        fundo: cores.fundo,
        cartao: cores.cartao,
        borda: cores.borda,
        texto: cores.texto,
        textoSecundario: cores.textoSecundario,
        destaque: cores.destaque,
        destaqueFundo: cores.destaqueFundo,
        aviso: cores.aviso,
        erro: cores.erro,
      },
      fontFamily: {
        titulo: ['BebasNeue-Regular'],
      },
    },
  },
  plugins: [],
};
