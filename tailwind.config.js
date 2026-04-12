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
    },
  },
  plugins: [],
};
