/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        ink: '#1B1420',
        paper: '#FBF6EE',
        mango: '#FFB238',
        guava: '#FF3D77',
        jungle: '#1B6B4A',
        sun: '#FFD23F',
        coral: '#FF6B4A',
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#FF3D77',
          foreground: '#FBF6EE',
        },
        secondary: {
          DEFAULT: '#1B6B4A',
          foreground: '#FBF6EE',
        },
        muted: {
          DEFAULT: '#F1E9DA',
          foreground: '#6B5F52',
        },
      },
      backgroundImage: {
        'festival-gradient': 'linear-gradient(135deg, #FFB238 0%, #FF3D77 60%, #7A1FA2 100%)',
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
