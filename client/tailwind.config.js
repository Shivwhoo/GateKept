/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F4F1EA',
          card: '#FAF8F5',
          dark: '#EBE7DE',
          subtle: '#E2DDD2'
        },
        ink: {
          DEFAULT: '#16150F',
          muted: '#5F5C54',
          subtle: '#8C897E',
          faint: '#D4D0C5'
        },
        signal: {
          DEFAULT: '#FF5B1F',
          hover: '#E54B11',
          light: '#FFF0EB',
          subtle: '#FFE2D6'
        },
        olive: {
          DEFAULT: '#5C6B3C',
          light: '#EEF2E6',
          hover: '#4C5931'
        },
        amber: {
          DEFAULT: '#C28800',
          light: '#FEF8EA',
          hover: '#A67400'
        },
        brick: {
          DEFAULT: '#C53030',
          light: '#FDF2F2',
          hover: '#9B2C2C'
        }
      },
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'ink-sm': '2px 2px 0px #16150F',
        'ink': '4px 4px 0px #16150F',
        'ink-lg': '6px 6px 0px #16150F',
        'signal': '4px 4px 0px #FF5B1F',
      },
      borderWidth: {
        '1.5': '1.5px',
      },
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '3px',
        'md': '4px',
      }
    },
  },
  plugins: [],
}

