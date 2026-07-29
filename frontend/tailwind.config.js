/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // `brand` and `gold` are shade scales (50-900 / 50-700) derived from the four guardrail
        // brand colors below, used for hover/active/border/tint variations across the UI.
        // `soft-pink`, `rose-gold`, `dark-brown` are first-class aliases for those literal colors
        // (white is Tailwind's built-in `white`). Elsewhere in the codebase, usage of red-*/green-*/
        // yellow-*/blue-*/amber-* is a deliberate, bounded exception reserved for semantic status and
        // destructive UI (booking status badges, success/error alerts, delete/cancel actions, sign-out) —
        // it is not used for general decoration.
        'soft-pink': '#F8BBD0',
        'rose-gold': '#D4A373',
        'dark-brown': '#4A2C2A',
        brand: {
          50: '#fef6f8',
          100: '#fce8ee',
          200: '#f8d3de',
          300: '#f8bbd0',
          400: '#f295b3',
          500: '#e8698f',
          600: '#d84b76',
          700: '#b83a60',
          800: '#96304f',
          900: '#4a2c2a',
        },
        gold: {
          50: '#faf6f0',
          100: '#f2e6d3',
          200: '#e6cca7',
          300: '#d4a373',
          400: '#c48f5a',
          500: '#ab7a47',
          600: '#8a613a',
          700: '#6b4b2e',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
