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
        apple: {
          red: "#FA243C",
          redHover: "#FF375F",
          redDark: "#D60E2E",
          pink: "#FF2D55",
          card: "rgba(24, 24, 28, 0.75)",
          cardHover: "rgba(36, 36, 42, 0.85)",
        },
        aura: {
          bg: "#050507",
          card: "rgba(22, 22, 26, 0.75)",
          cardHover: "rgba(32, 32, 38, 0.85)",
          border: "rgba(255, 255, 255, 0.08)",
          accent: "#FA243C",
          accentGlow: "rgba(250, 36, 60, 0.45)",
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
