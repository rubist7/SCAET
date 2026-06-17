/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b7be8',
          600: '#6d5ed4',
          700: '#5b4ec2',
          800: '#4c3fa8',
          900: '#3d3290',
        },
        sand: {
          50: '#faf7f2',
          100: '#f2ece0',
          200: '#e5dbc8',
          300: '#d0c4a8',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        logo: ['"Archivo Black"', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
