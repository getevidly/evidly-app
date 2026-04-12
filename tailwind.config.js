/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './apps/web-vendor/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          gold:      '#A08C5A',
          goldLight: '#C4AE7A',
          goldDark:  '#7A6840',
          navy:      '#1E2D4D',
          navyLight: '#2A3F6B',
          navyDark:  '#141E33',
        },
        navy: {
          DEFAULT: '#1E2D4D',
          light:   '#2A3F6B',
          dark:    '#141E33',
        },
        gold: {
          DEFAULT: '#A08C5A',
          light:   '#C4AE7A',
          dark:    '#7A6840',
        },
        cream:   '#FAF7F0',
        'brand-gold': '#A08C5A',
        'brand-navy': '#1E2D4D',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(11,22,40,0.06), 0 1px 2px rgba(11,22,40,0.04)',
        'card-hover': '0 10px 25px rgba(11,22,40,0.08), 0 4px 10px rgba(11,22,40,0.04)',
        'elevated': '0 20px 40px rgba(11,22,40,0.1), 0 8px 16px rgba(11,22,40,0.06)',
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
};
