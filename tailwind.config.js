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
        spotify: {
          base: "#121212",
          dark: "#0a0a0a",
          card: "#181818",
          cardHover: "#282828",
          cardElevated: "#242424",
          green: "#1DB954",
          greenHover: "#1ed760",
          greenGlow: "rgba(29, 185, 84, 0.4)",
          subtext: "#b3b3b3",
          muted: "#a7a7a7",
          border: "rgba(255, 255, 255, 0.08)",
        },
        aura: {
          bg: "#121212",
          card: "rgba(24, 24, 24, 0.85)",
          cardHover: "rgba(40, 40, 40, 0.95)",
          border: "rgba(255, 255, 255, 0.08)",
          accent: "#1DB954",
          accentGlow: "rgba(29, 185, 84, 0.45)",
          textPrimary: "#f4f4f5",
          textSecondary: "#b3b3b3",
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
