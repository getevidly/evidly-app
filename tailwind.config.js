/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
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
        'brand-gold': '#A08C5A',
        'brand-navy': '#1E2D4D',
      },
    },
  },
  plugins: [],
};
