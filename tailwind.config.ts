import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleur principale de la marque LifEase (bordeaux)
        wine: {
          50: "#FBEEF0",
          100: "#F3D9DC",
          200: "#E8B9BE",
          300: "#D68B93",
          400: "#B85763",
          500: "#8C2E3A",
          600: "#6B1E2C", // couleur de marque principale
          700: "#571825",
          800: "#43121C",
          900: "#2E0C13",
        },
        ink: {
          900: "#2A2A2A",
          600: "#5C5C5C",
          400: "#8A8A8A",
        },
        cream: "#FFFFFF",
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
        // Ombres très légères uniquement, cohérent avec le brief "premium mais simple"
        card: "0 1px 3px rgba(43, 12, 19, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
