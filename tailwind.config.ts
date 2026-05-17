import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        lilac: "#d8b4fe",
        lavender: "#c4b5fd",
        violetSoft: "#a78bfa",
        purpleDeep: "#4c1d95",
        purpleNight: "#2e1065"
      },
      boxShadow: {
        glass: "0 8px 32px rgba(76, 29, 149, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
