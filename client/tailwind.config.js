/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          dark: {
            900: '#0a0a0a', // Derin Siyah (Arkaplan)
            800: '#121212', // Kart Rengi
            700: '#1E1E1E', // Input/Border Rengi
          },
          primary: {
            500: '#6366f1', // Neon İndigo
            600: '#4f46e5',
            glow: 'rgba(99, 102, 241, 0.5)' // Parlama efekti
          },
          accent: {
            500: '#10b981', // Neon Yeşil
          }
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-out',
          'slide-up': 'slideUp 0.5s ease-out',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          }
        }
      },
    },
    plugins: [],
  }