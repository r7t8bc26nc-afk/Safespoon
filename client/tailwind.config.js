/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 'Switzer' matches the name Fontshare gives the font
        sans: ['Switzer', 'sans-serif'],
        // 'Host Grotesk' matches the name Google gives the font
        host: ['"Host Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}