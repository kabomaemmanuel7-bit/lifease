import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Rouge — couleur de marque : actions principales, accents, icônes, liens
        wine: {
          50: "#FBEEF0",
          100: "#F3D9DC",
          200: "#E8B9BE",
          300: "#D68B93",
          400: "#B85763",
          500: "#8C2E3A",
          600: "#6B1E2C",
          700: "#571825",
          800: "#43121C",
          900: "#2E0C13",
        },
        // Beige — fonds de page, fonds secondaires, séparateurs
        beige: {
          50: "#FBF8F2",
          100: "#F5EEE0",
          200: "#EAE0C8",
          300: "#DBC9A0",
        },
        // Gris neutres — texte
        ink: {
          900: "#2A2A2A",
          600: "#5C5C5C",
          400: "#8A8A8A",
        },
        // Blanc — cartes et surfaces au premier plan (utiliser bg-white)
        cream: "#FBF8F2",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        pill: "999px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(43, 12, 19, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
