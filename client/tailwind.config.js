/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada no protótipo "Bingo do Anthony": fundo azul-marinho, acento laranja.
        bingoNavy: '#10142A',
        bingoNavyLight: '#1B2040',
        bingoOrange: '#F5A623',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'sans-serif'],
        body: ['"Nunito Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


