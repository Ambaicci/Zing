/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Hercules-Inspired Deep Dark Color Palette
      colors: {
        z: {
          page: '#09090b',         // Deepest background (Zinc 950)
          bg: '#111113',           // App background (Slightly lighter charcoal)
          surface: '#1c1c1f',      // Card/Panel background (Rich dark gray)
          'surface-hi': '#27272a', // Hover states & elevated surfaces (Zinc 800)
          border: '#2e2e33',       // Subtle, low-contrast borders
          text: '#fafafa',         // Primary text (Zinc 50 - crisp white)
          'text-dim': '#a1a1aa',   // Secondary text (Zinc 400)
          'text-faint': '#71717a', // Tertiary text / placeholders (Zinc 500)
          purple: '#a855f7',       // Primary brand (Vibrant Purple)
          blue: '#3b82f6',         // Secondary brand (Vibrant Blue)
          green: '#10b981',        // Success (Vibrant Emerald)
          red: '#ef4444',          // Error/Danger (Vibrant Red)
          orange: '#f97316',       // Warning (Vibrant Orange)
        },
      },
      
      // Premium Typography
      fontFamily: {
        display: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        body: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'Fira Code', 'monospace'],
      },
      
      // Authoritative Letter Spacing
      letterSpacing: {
        tighter: '-0.04em', // For monumental headings
        wide: '0.05em',     // For uppercase data labels
      },

      // Custom Animations for GenUI Components
      animation: {
        'slideDown': 'slideDown 0.3s ease-out',
        'fadeIn': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};