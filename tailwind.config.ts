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
          50: "#EAF7EF",
          100: "#D3EEDE",
          200: "#A9DDBF",
          300: "#5FBF86",
          400: "#2FA062",
          500: "#0F8541",
          600: "#0F8541",
          700: "#06552C",
          800: "#06552C",
          900: "#043D20",
        },
        // Beige — fonds de page, fonds secondaires, séparateurs
        beige: {
          50: "#F1FAF4",
          100: "#E1F3E8",
          200: "#CFE8D9",
          300: "#A9DDBF",
        },
        // Gris neutres — texte
        ink: {
          900: "#0F2A1C",
          600: "#4F655A",
          400: "#7B8F84",
        },
        // Blanc — cartes et surfaces au premier plan (utiliser bg-white)
        cream: "#F1FAF4",
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
