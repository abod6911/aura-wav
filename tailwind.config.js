/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aura: {
          bg: "#09090b",
          card: "rgba(18, 18, 23, 0.7)",
          cardHover: "rgba(28, 28, 36, 0.8)",
          border: "rgba(255, 255, 255, 0.08)",
          accent: "#6366f1",
          accentGlow: "rgba(99, 102, 241, 0.4)",
          textPrimary: "#f4f4f5",
          textSecondary: "#a1a1aa",
          muted: "#71717a",
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
