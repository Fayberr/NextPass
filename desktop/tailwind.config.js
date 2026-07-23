/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../extension/src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0F0E13',
          800: '#16141C',
          700: '#1D1A26',
          600: '#272233',
        },
        violet: {
          glow: '#8B5CF6',
          soft: '#A78BFA',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        glass: '0 8px 40px -12px rgba(139, 92, 246, 0.35)',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
};
