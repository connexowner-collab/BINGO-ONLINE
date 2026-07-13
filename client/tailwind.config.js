/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta exata do documento de identidade visual "Bingo do Anthony".
        bingoNavy: '#10142A', // painel · superfície
        bingoNavyLight: '#1B2150', // painel · card elevado
        bingoInk: '#201B3B', // texto escuro / header da cartela
        bingoCream: '#FFF8EA', // cartela · superfície
        bingoCreamBorder: '#EADFC2',
        bingoOrange: '#F5A623', // bola / assinatura
        bingoGold: '#FBC259', // estrelas, gradiente da bola
        bingoGoldDark: '#C97F12',
        bingoBlue: '#5C8DF2', // azul estrutural (faixas/banners)
        bingoBlueDeep: '#3E6FD9',
        bingoAlert: '#FF4D5E', // falta 1
        bingoWarn: '#FFC24B', // faltam 2
        bingoWin: '#2FD98A', // vitória
      },
      fontFamily: {
        display: ['"Baloo 2"', 'sans-serif'],
        body: ['"Nunito Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


