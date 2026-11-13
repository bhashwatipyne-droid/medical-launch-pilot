import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0f172a', soft: '#475569', faint: '#94a3b8' },
        brand: { DEFAULT: '#1d4ed8', dark: '#1e3a8a', tint: '#eff4ff' },
      },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
}
export default config
