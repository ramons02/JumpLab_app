/** Cores do tema escuro com destaque verde (D16), as mesmas do protótipo. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        fundo: '#050706',
        superficie: '#121816',
        borda: '#263130',
        'borda-forte': '#34403c',
        texto: '#eef3f0',
        'texto-suave': '#93a29b',
        'texto-apagado': '#6b7a74',
        marca: { fraca: '#13361f', DEFAULT: '#2ee58a', forte: '#5ff2a8' },
        erro: { fraco: '#2c1414', DEFAULT: '#f87171' },
      },
    },
  },
  plugins: [],
};
