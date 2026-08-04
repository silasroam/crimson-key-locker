/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        crimson: {
          50: '#fff1f2',
          100: '#ffe1e3',
          200: '#ffc8cc',
          300: '#ffa1a8',
          400: '#ff6b76',
          500: '#f43f4e',
          600: '#dc1f30',
          700: '#b91224',
          800: '#991220',
          900: '#7f1520',
          950: '#45060d',
        },
        void: {
          950: '#050507',
          900: '#0a0a0f',
          800: '#101018',
          700: '#16161f',
          600: '#1d1d28',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'crimson-glow': '0 0 40px -8px rgba(220, 31, 48, 0.55)',
        'crimson-glow-lg': '0 0 80px -12px rgba(220, 31, 48, 0.65)',
        'crimson-glow-sm': '0 0 20px -4px rgba(220, 31, 48, 0.5)',
        'inner-glow': 'inset 0 0 30px rgba(220, 31, 48, 0.15)',
      },
      backgroundImage: {
        'crimson-gradient':
          'linear-gradient(135deg, #dc1f30 0%, #7f1520 50%, #45060d 100%)',
        'crimson-radial':
          'radial-gradient(circle at 50% 0%, rgba(220,31,48,0.15) 0%, transparent 60%)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px -4px rgba(220, 31, 48, 0.4)' },
          '50%': { boxShadow: '0 0 50px -4px rgba(220, 31, 48, 0.8)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};