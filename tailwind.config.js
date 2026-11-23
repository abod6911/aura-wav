/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: '400px',
      },
      colors: {
        obsidian: {
          base: "#060609",
          deep: "#030305",
          elevated: "#0c0c14",
        },
        apple: {
          red: "#FA243C",
          redHover: "#FF375F",
          redDark: "#D60E2E",
          pink: "#FF2D55",
          card: "rgba(255, 255, 255, 0.035)",
          cardHover: "rgba(255, 255, 255, 0.07)",
        },
        // Spotify Matte Dark Design Tokens
        spotify: {
          base: "#121212",
          dark: "#000000",
          surface: "#181818",
          card: "#181818",
          cardHover: "#282828",
          cardElevated: "#242424",
          hover: "#242424",
          green: "#1DB954",
          greenHover: "#1ED760",
          greenGlow: "rgba(29, 185, 84, 0.25)",
          subtext: "#B3B3B3",
          muted: "#727272",
          border: "rgba(255, 255, 255, 0.08)",
        },
        aura: {
          bg: "#121212",
          card: "#181818",
          cardHover: "#282828",
          border: "rgba(255, 255, 255, 0.08)",
          accent: "#1DB954",
          accentHover: "#1ED760",
          accentGlow: "rgba(29, 185, 84, 0.25)",
          textPrimary: "#FFFFFF",
          textSecondary: "#B3B3B3",
          muted: "#727272",
        }
      },
      spacing: {
        '13': '3.25rem',
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
      },
      borderRadius: {
        'squircle-sm': '12px',
        'squircle-md': '18px',
        'squircle-lg': '28px',
        'squircle-xl': '34px',
      },
      fontFamily: {
        sans: ['Readex Pro', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        arabic: ['Readex Pro', 'sans-serif'],
        latin: ['Plus Jakarta Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
