/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      screens: {
        'xs': '375px',
      },
      colors: {
        'yellow-accent': '#ffd34d',
        'dark-bg': '#191816',
      }
    },
  },
  plugins: [],
}
