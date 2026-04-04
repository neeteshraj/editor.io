import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        surface: {
          0: '#030303',
          1: '#0a0a0f',
          2: '#111118',
          3: '#1a1a24',
          4: '#222230',
        },
      },
      animation: {
        'aurora-1': 'aurora1 16s ease-in-out infinite alternate',
        'aurora-2': 'aurora2 20s ease-in-out infinite alternate',
        'aurora-3': 'aurora3 14s ease-in-out infinite alternate',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'border-spin': 'border-spin 4s linear infinite',
      },
      keyframes: {
        aurora1: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(8%, 12%) scale(1.15)' },
        },
        aurora2: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(-10%, -8%) scale(1.1)' },
        },
        aurora3: {
          '0%': { transform: 'translate(0, 0) rotate(0deg)' },
          '100%': { transform: 'translate(-15%, 10%) rotate(20deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'border-spin': {
          to: { '--angle': '360deg' },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
}
