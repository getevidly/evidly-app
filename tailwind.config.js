/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-gold': '#A08C5A',
        'brand-navy': '#1E2D4D',
      },
    },
  },
  plugins: [],
};
