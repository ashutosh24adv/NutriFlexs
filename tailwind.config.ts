import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nutri: {
          bg: "#FAFBF8",
          card: "#FFFFFF",
          green: "#1B4D3E",
          "green-hover": "#256653",
          "green-light": "#E8F3EE",
          "green-soft": "#D6ECE3",
          "green-dark": "#113429",
          sage: "#8AA899",
          charcoal: "#1A1E1C",
          muted: "#5F6B65",
          border: "#E2E8E4",
          "border-light": "#F0F4F1",
          gold: "#D97706",
          accent: "#22C55E"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "Poppins", "Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px -2px rgba(27, 77, 62, 0.06)",
        float: "0 12px 32px -4px rgba(27, 77, 62, 0.12)",
        glow: "0 0 20px rgba(27, 77, 62, 0.18)",
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        slideUp: {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        }
      },
      animation: {
        "pulse-slow": "pulseGlow 3s ease-in-out infinite",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }
    },
  },
  plugins: [],
};

export default config;
