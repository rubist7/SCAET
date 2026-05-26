/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Su paleta neutral y limpia para el sistema del hotel
        plataformaBg: '#f8fafc',
        sidebarGris: '#0f172a',
        azulBoton: '#3b82f6'
      }
    },
  },
  plugins: [],
}