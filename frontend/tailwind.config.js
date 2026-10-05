/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: '#0f172a',      // background
        surface: '#161e2e',   // cards / panels
        border: '#242f45',
        accent: '#6366f1',    // indigo accent
        accent2: '#22d3ee',   // cyan secondary accent
        muted: '#8b95a7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
