/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0E14',
        card: '#131722',
        border: '#2A3142',
        primary: '#3B82F6',
        accent: '#10B981',
        danger: '#EF4444',
        text: '#E2E8F0',
        muted: '#94A3B8'
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}