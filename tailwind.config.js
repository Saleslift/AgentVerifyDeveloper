/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000',
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#CCCCCC',
          300: '#000000',
          400: '#1A1A1A',
          500: '#333333',
          600: '#4D4D4D',
          700: '#666666',
          800: '#808080',
          900: '#999999',
        },
        'on-primary': {
          DEFAULT: '#FFFFFF',
          hover: '#E5E5E5',
          muted: '#CCCCCC',
        },
        brand: {
          lime: '#C5DD58',
          yellow: '#F5EC39'
        }
      },
      screens: {
        'xs': '475px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      lineHeight: {
        'extra-tight': '1.1',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #C5DD58, #F5EC39)',
        'gradient-vertical': 'linear-gradient(to bottom, #ffffff 0%, #0f0f0f 100%)',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'glow': 'glow 2s ease-in-out infinite',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      }
    },
    container: {
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    }
  },
  plugins: [],
};