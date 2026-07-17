/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Deep near-black anthracite base + violet/indigo accent (per design spec).
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
