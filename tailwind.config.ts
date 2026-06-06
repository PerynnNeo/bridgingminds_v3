import type { Config } from 'tailwindcss';

/**
 * BridgingMinds design system.
 * Pastel green primary, soft neutrals, gentle accents. Rounded, mobile-first, youth-friendly.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Primary: pastel / sage / mint green scale
        primary: {
          50: '#f0f9f4',
          100: '#dcf0e4',
          200: '#bce0cd',
          300: '#8fcaab', // light mint
          400: '#5faf86',
          500: '#3f9268', // core pastel green
          600: '#2f7553',
          700: '#285d44',
          800: '#234a38',
          900: '#1e3d2f',
        },
        sage: '#9caf88',
        mint: '#c5e8d5',
        // Secondary neutrals
        cream: '#fbfaf7', // off-white background
        charcoal: '#2b3138', // soft charcoal text
        // Accents
        info: '#7ea8d4', // soft blue, guidance / informational
        warning: '#f5c97b', // warm yellow, streaks / achievements
        danger: '#e08a8a', // muted red, errors only
        success: '#3f9e72', // positive green, confirmations / "good" states
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(47, 117, 83, 0.12)',
        card: '0 2px 12px -2px rgba(43, 49, 56, 0.08)',
      },
      keyframes: {
        'record-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(63, 146, 104, 0.45)' },
          '50%': { boxShadow: '0 0 0 16px rgba(63, 146, 104, 0)' },
        },
        'fill-up': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--fill-to, 100%)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'record-pulse': 'record-pulse 1.6s ease-out infinite',
        'fill-up': 'fill-up 0.8s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
