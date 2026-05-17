import type { Config } from "tailwindcss";

export default {
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
        "hagor-gold": "#C89211",
        "hagor-black": "#0B0B0B",
        "hagor-olive": "#4B5320",
        "hagor-gray": "#1A1A1A",
      },
    },
  },
  plugins: [],
} satisfies Config;
