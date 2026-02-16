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
        'serif': ['Fraunces', 'serif'],
      },
      screens: {
        'xs': '375px',
      },
      colors: {
        'yellow-accent': '#ffd34d',
        'dark-bg': '#191816',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInFromTop: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        'in': 'fadeIn 0.3s ease-out, slideInFromTop 0.3s ease-out',
      }
    },
  },
  plugins: [],
}
