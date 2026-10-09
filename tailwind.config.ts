import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f1fb',
          100: '#e9e2f7',
          500: '#7c5cbf',
          600: '#6a4dae',
          700: '#573d94',
        },
      },
    },
  },
  plugins: [],
};

export default config;
