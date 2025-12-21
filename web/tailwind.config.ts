import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#05060a",
        ink: "#0b0f15",
        neon: "#22f2ff",
        tide: "#00d6ff",
        pulse: "#12f4c9",
      },
      boxShadow: {
        glow: "0 0 24px rgba(34, 242, 255, 0.2)",
        "glow-lg": "0 0 40px rgba(34, 242, 255, 0.25)",
        "glow-soft": "0 0 14px rgba(34, 242, 255, 0.16)",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
