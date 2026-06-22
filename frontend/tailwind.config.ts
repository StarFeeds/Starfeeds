import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#F9F5FF",
          400: "#C590FB",
          500: "#A25EE6",
          600: "#7E2BD1",
          700: "#4D0695",
        },
        secondary: {
          500: "#EE46BC",
          700: "#C11574",
        },
        neutral: {
          100: "#F5F5F5",
          200: "#E9EAEB",
          300: "#D5D7DA",
          500: "#717680",
          600: "#535862",
          700: "#414651",
          900: "#181D27",
        },
        success: {
          500: "#12B76A",
        },
        destructive: {
          500: "#F04438",
        },
        white: "#FFFFFF",
      },
      fontFamily: {
        lato: ["Lato", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      fontSize: {
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["20px", { lineHeight: "30px" }],
      },
      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(10, 13, 18, 0.05)",
        sm: "0 1px 2px 0 rgba(10, 13, 18, 0.09), 0 1px 3px 0 rgba(10, 13, 18, 0.10)",
        md: "0 20px 50px -20px rgba(127, 89, 248, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
