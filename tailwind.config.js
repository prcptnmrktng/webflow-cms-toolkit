/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pm-dark': '#010101',
        'pm-gray': '#0d0d0d',
        'pm-gray-light': '#1a1a1a',
        'pm-border': '#2a2a2a',
        'pm-accent': '#ce7929',
        'pm-accent-light': '#ffe0bb',
        'pm-blue': '#3389ca',
        'pm-blue-dark': '#1f2056',
        'pm-success': '#0b793d',
        'pm-warning': '#ce7929',
        'pm-error': '#cc4029',
        'pm-text': '#f3f3f3',
        'pm-text-muted': '#bebebe',
      },
      fontFamily: {
        'display': ['Copperplate', 'serif'],
        'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
