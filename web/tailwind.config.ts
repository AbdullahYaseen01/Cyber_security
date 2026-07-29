import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          950: "#0B0F19",
          900: "#0F1525",
          800: "#151C30",
        },
        cyan: {
          400: "#00F0FF",
          500: "#00D4E8",
        },
        alert: {
          red: "#FF3366",
          amber: "#FFB800",
          green: "#00E676",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(0,240,255,0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(0,240,255,0.4)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
