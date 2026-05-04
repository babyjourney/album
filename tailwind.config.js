/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          1: 'var(--ink-1)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
          'on-glass': 'var(--ink-on-glass)',
          'on-accent': 'var(--ink-on-accent)',
        },
        glass: {
          1: 'var(--glass-1)',
          2: 'var(--glass-2)',
          3: 'var(--glass-3)',
          hairline: 'var(--glass-hairline)',
          'hairline-strong': 'var(--glass-hairline-strong)',
        },
        accent: {
          iris: '#7c3aed',
          'iris-soft': 'rgba(124, 58, 237, 0.16)',
          aqua: '#06b6d4',
          'aqua-soft': 'rgba(6, 182, 212, 0.16)',
          peach: '#fb7185',
          'peach-soft': 'rgba(251, 113, 133, 0.16)',
          mint: '#34d399',
          'mint-soft': 'rgba(52, 211, 153, 0.16)',
          amber: '#f59e0b',
          'amber-soft': 'rgba(245, 158, 11, 0.16)',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SF Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'glass-sm': '14px',
        'glass': '20px',
        'glass-lg': '28px',
        'glass-xl': '36px',
      },
      boxShadow: {
        'glass-sm': '0 2px 12px -2px rgba(15, 15, 30, 0.10), inset 0 1px 0 0 rgba(255, 255, 255, 0.30)',
        'glass': '0 8px 32px -8px rgba(15, 15, 30, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.45)',
        'glass-lg': '0 24px 60px -16px rgba(15, 15, 30, 0.28), inset 0 1px 0 0 rgba(255, 255, 255, 0.55)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.55), inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)',
        'glow-iris': '0 0 40px -8px rgba(124, 58, 237, 0.55)',
        'glow-aqua': '0 0 40px -8px rgba(6, 182, 212, 0.55)',
        'glow-peach': '0 0 40px -8px rgba(251, 113, 133, 0.55)',
      },
      backdropBlur: {
        glass: '24px',
        'glass-lg': '40px',
      },
      backdropSaturate: {
        glass: '180%',
      },
      keyframes: {
        'glass-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
        },
        'glass-pop': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '60%': { opacity: '1', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'aurora-drift': {
          '0%, 100%': { transform: 'translate(0%, 0%) rotate(0deg)' },
          '33%': { transform: 'translate(8%, -6%) rotate(120deg)' },
          '66%': { transform: 'translate(-6%, 4%) rotate(240deg)' },
        },
        'shimmer-band': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'orbit-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'glass-in': 'glass-in 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        'glass-pop': 'glass-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'aurora-drift': 'aurora-drift 28s ease-in-out infinite',
        'shimmer-band': 'shimmer-band 2.5s ease-in-out infinite',
        'orbit-slow': 'orbit-slow 60s linear infinite',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'silk': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
