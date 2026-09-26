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
        background: "#0b0b0c",
        foreground: "#f4f1ea",
        gold: {
          DEFAULT: "#c9a44c",
          light: "#e4c876",
          dark: "#8f7530",
        },
      },
    },
  },
  plugins: [],
};

export default config;
