/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Hercules.app-Inspired Light Theme Color Palette
      colors: {
        z: {
          page: '#fafafa',           // Light gray background (Zinc 50)
          bg: '#ffffff',             // Pure white for cards/panels
          surface: '#ffffff',        // White surfaces
          'surface-hi': '#f4f4f5',   // Hover states (Zinc 100)
          border: '#e4e4e7',         // Subtle borders (Zinc 300)
          text: '#18181b',           // Primary text - dark navy (Zinc 950)
          'text-dim': '#71717a',     // Secondary text (Zinc 500)
          'text-faint': '#a1a1aa',   // Tertiary text (Zinc 400)
          primary: '#5B5FF5',        // Vibrant indigo (Hercules blue)
          'primary-dark': '#4F46E5', // Darker indigo for hover states
          success: '#10b981',        // Emerald green
          error: '#ef4444',          // Vibrant red
          warning: '#f59e0b',        // Amber orange
        },
      },
      
      // Premium Typography (Same as before)
      fontFamily: {
        display: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        body: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'Fira Code', 'monospace'],
      },
      
      // Authoritative Letter Spacing
      letterSpacing: {
        tighter: '-0.04em', 
        wide: '0.05em',     
      },

      // Subtle Shadows for Cards (Hercules.app style)
      boxShadow: {
        'hercules': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'hercules-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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