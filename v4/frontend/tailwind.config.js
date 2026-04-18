/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#090B10',
        panelBg: '#121620',
        neonBlue: '#00D1FF',
        neonGreen: '#00FFA3',
        neonRed: '#FF3B3B',
        neonYellow: '#FFD600',
        textMuted: '#94A3B8'
      }
    },
  },
  plugins: [],
}
