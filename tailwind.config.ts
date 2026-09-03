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
          bg: "#FCFDFC",
          card: "#FFFFFF",
          green: "#2F7D16",
          "green-hover": "#24630F",
          "green-deep": "#24630F",
          "green-fresh": "#4E9F2F",
          "green-light": "#EAF4E3",
          "green-soft": "#F3F7EE",
          "green-verylight": "#F7FAF4",
          "green-dark": "#24630F",
          sage: "#F3F7EE",
          charcoal: "#111111",
          secondary: "#4B5563",
          muted: "#6B7280",
          border: "#E5E7E2",
          "border-light": "#E5E7E2",
          gold: "#D97706",
          accent: "#4E9F2F"
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
