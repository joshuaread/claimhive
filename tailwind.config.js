/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hive: {
          gold: {
            50:  '#FDFBF5',
            100: '#FAF2DC',
            200: '#F4E2AB',
            300: '#ECCE72',
            400: '#E3BC4D',
            500: '#DAA94F', /* Core Brand Honey Gold */
            600: '#B88530',
            700: '#8E631F',
            800: '#674415',
            900: '#442B0C',
          },
          navy: {
            50:  '#F5F7FB',
            100: '#E5E9F3',
            200: '#C8D2E4',
            300: '#A1B2D0',
            400: '#728DB3',
            500: '#4B6993',
            600: '#334C72',
            700: '#243654',
            800: '#1B273F',
            900: '#161B33', /* Core Brand Midnight Navy */
            950: '#0C0F1D',
          },
          canvas: {
            DEFAULT: '#FAF9F6',
            alt: '#F4F2EC',
          },
          border: {
            whisper: 'rgba(22, 27, 51, 0.05)',
            subtle: 'rgba(22, 27, 51, 0.09)',
            DEFAULT: '#DFD9CE',
            strong: '#C2B8A6',
          },
          status: {
            settled: '#0D7A4D',
            'settled-bg': '#EEFAF3',
            urgent: '#C93828',
            'urgent-bg': '#FEF3F2',
            info: '#1A65B5',
            'info-bg': '#EFF5FD',
            warning: '#BF7110',
            'warning-bg': '#FEF8EC',
          }
        }
      },
      fontFamily: {
        heading: ['"Merriweather"', 'Georgia', 'serif'],
        editorial: ['"Newsreader"', 'Georgia', 'serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'hive-xs': '4px',
        'hive-sm': '8px',
        'hive-md': '14px',
        'hive-lg': '20px',
        'hive-xl': '28px',
        'hive-2xl': '36px',
      },
      boxShadow: {
        'hive-ambient': '0 1px 3px rgba(18, 22, 37, 0.03)',
        'hive-soft': '0 4px 20px rgba(18, 22, 37, 0.04), 0 1px 3px rgba(18, 22, 37, 0.02)',
        'hive-card': '0 10px 30px rgba(18, 22, 37, 0.05), 0 2px 8px rgba(18, 22, 37, 0.02)',
        'hive-hero': '0 20px 60px rgba(18, 22, 37, 0.07), 0 4px 16px rgba(18, 22, 37, 0.03)',
        'hive-gold': '0 12px 36px rgba(218, 169, 79, 0.22)',
        'hive-navy': '0 20px 50px rgba(22, 27, 51, 0.32)',
      }
    },
  },
  plugins: [],
}
