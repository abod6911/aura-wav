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
        // Re-routed legacy Spotify tokens into luxury Apple Liquid Glass equivalents
        spotify: {
          base: "#060609",
          dark: "#030305",
          card: "rgba(255, 255, 255, 0.035)",
          cardHover: "rgba(255, 255, 255, 0.065)",
          cardElevated: "rgba(255, 255, 255, 0.08)",
          green: "#FA243C",
          greenHover: "#FF375F",
          greenGlow: "rgba(250, 36, 60, 0.4)",
          subtext: "rgba(255, 255, 255, 0.75)",
          muted: "rgba(255, 255, 255, 0.55)",
          border: "rgba(255, 255, 255, 0.08)",
        },
        aura: {
          bg: "#060609",
          card: "rgba(255, 255, 255, 0.035)",
          cardHover: "rgba(255, 255, 255, 0.065)",
          border: "rgba(255, 255, 255, 0.08)",
          accent: "var(--aura-accent, #FA243C)",
          accentHover: "var(--aura-accent-hover, #FF375F)",
          accentGlow: "var(--aura-accent-glow, rgba(250, 36, 60, 0.4))",
          textPrimary: "#f4f4f5",
          textSecondary: "rgba(255, 255, 255, 0.75)",
          muted: "rgba(255, 255, 255, 0.55)",
        }
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
