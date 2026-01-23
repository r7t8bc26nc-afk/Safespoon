/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: { 
        surface: "#F5F3FF", 
        brand: { 
            dark: "#1E1B4B",   
            primary: "#8B5CF6", 
            secondary: "#A78BFA",
            accent: "#F59E0B", 
            success: "#10B981",
            white: "#FFFFFF"
        }
      },
    },
  },
  plugins: [],
}