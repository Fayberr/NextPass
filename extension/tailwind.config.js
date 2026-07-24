/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Themeable foreground: `white` is remapped to the --pm-fg CSS variable so every
        // existing text-white/N, bg-white/N, border-white/N utility follows the active theme
        // (dark keeps --pm-fg at 255 255 255, pixel-identical to before; light flips it to a
        // deep ink). Variables live in globals.css under :root / [data-theme='light'].
        // For elements that must stay literally white in both themes (text on solid violet
        // buttons, etc.) use text-[#fff].
        white: 'rgb(var(--pm-fg) / <alpha-value>)',
        // Opaque elevated surface (dropdowns, floating panels) that inverts with the theme.
        surface: 'rgb(var(--pm-surface) / <alpha-value>)',
        // Deep near-black anthracite base + violet/indigo accent (per design spec).
        ink: {
          900: '#0F0E13',
          800: '#16141C',
          700: '#1D1A26',
          600: '#272233',
        },
        violet: {
          glow: '#8B5CF6',
          // Accent *text* shades route through variables so light mode can deepen them for
          // contrast (violet-glow stays fixed - it's used in gradients/borders).
          soft: 'var(--pm-violet-soft)',
          200: 'var(--pm-violet-200)',
          300: 'var(--pm-violet-300)',
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
