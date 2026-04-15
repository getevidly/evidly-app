// Base font size: 15px (set in src/index.css body)
// Standard Tailwind assumes 16px. Our rem-based values render ~6% smaller.
// This is intentional for information-dense compliance UI.

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './apps/web-vendor/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1E2D4D',
          light:   '#283f6a',
          dark:    '#141E33',
          deeper:  '#0B1628',
          mid:     '#3D5068',
          hover:   '#162340',
          muted:   '#163a5f',
        },
        gold: {
          DEFAULT: '#A08C5A',
          light:   '#C4AE7A',
          dark:    '#7A6840',
        },
        cream: {
          DEFAULT: '#FAF7F0',
          warm:    '#FAF7F2',
        },
        slate_ui: '#6B7F96',
        border_ui: {
          DEFAULT: '#E5E0D8',
          warm:    '#E2D9C8',
          cool:    '#D1D9E6',
          light:   '#F0EDE6',
        },
      },
      fontFamily: {
        body: ['Montserrat', 'Helvetica Neue', 'sans-serif'],
        logo: ['Syne', 'sans-serif'],
      },
      boxShadow: {
        'card-sm': '0 1px 3px rgba(30,45,77,0.06), 0 1px 2px rgba(30,45,77,0.04)',
        'card-md': '0 4px 12px rgba(30,45,77,0.08), 0 2px 4px rgba(30,45,77,0.04)',
        'card-lg': '0 12px 36px rgba(30,45,77,0.12), 0 4px 12px rgba(30,45,77,0.06)',
        'gold-glow': '0 0 0 3px rgba(160, 140, 90, 0.25)',
      },
    },
  },
  plugins: [],
};
