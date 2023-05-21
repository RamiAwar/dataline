import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
  ],
  variants: {
    extend: {
      display: ["group-hover"],
    },
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...defaultTheme.fontFamily.sans],
      },
      animation: {
        bounce200: "bounce 1s infinite 100ms",
        bounce400: "bounce 1s infinite 200ms",
      },
      blur: {
        "4xl": "72px",
        "5xl": "96px",
        "6xl": "128px",
        "7xl": "160px",
      },
    },
  },
  extend: {
    display: ["group-hover"],
  },
  plugins: [require("@tailwindcss/forms"), require("flowbite/plugin")],
};
