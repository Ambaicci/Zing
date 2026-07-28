/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Zing Design System Colors (Dark Mode Optimized)
      colors: {
        z: {
          page: '#09090b',         // Deepest background
          bg: '#111113',           // App background
          surface: '#1e1e24',      // Card/Panel background
          'surface-hi': '#2a2a35', // Hover states
          border: '#2e2e3b',       // Borders
          text: '#f4f4f5',         // Primary text
          'text-dim': '#a1a1aa',   // Secondary text
          'text-faint': '#71717a', // Tertiary text
          purple: '#a855f7',       // Primary brand
          blue: '#3b82f6',         // Secondary brand
          green: '#10b981',        // Success
          red: '#ef4444',          // Error/Danger
          orange: '#f97316',       // Warning
        },
      },
      
      // Hercules-Inspired Typography
      fontFamily: {
        display: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        body: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'Fira Code', 'monospace'],
      },
      
      // Premium Letter Spacing
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