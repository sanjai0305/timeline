/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D0D1B',
        surface: {
          DEFAULT: '#19192D',
          card: '#16162A',
          secondary: '#24243F',
          muted: '#1E1E34',
          input: '#151528',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        brand: {
          purple: '#8B43EF',
          darkPurple: '#6435CC',
          accent: '#BD78FF',
          glow: '#A855F7',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B8B5D0',
          muted: '#7E7A9B',
        },
        status: {
          success: '#16B86A',
          danger: '#FF555F',
          warning: '#F59E0B',
          info: '#38BDF8',
        }
      },
      boxShadow: {
        'glow-purple': '0 0 25px -5px rgba(139, 67, 239, 0.45)',
        'glow-purple-sm': '0 0 12px -2px rgba(139, 67, 239, 0.35)',
        'glow-pill': '0 4px 15px rgba(100, 53, 204, 0.4)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'purple-gradient': 'linear-gradient(135deg, #8B43EF 0%, #6435CC 100%)',
        'purple-gradient-hover': 'linear-gradient(135deg, #9B56F5 0%, #7443DE 100%)',
        'purple-gradient-subtle': 'linear-gradient(135deg, rgba(139, 67, 239, 0.15) 0%, rgba(100, 53, 204, 0.1) 100%)',
        'hero-gradient': 'linear-gradient(135deg, #6435CC 0%, #3B1B7D 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}

