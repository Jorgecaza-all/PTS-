import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // UT Austin burnt orange, used in the header per the wireframes.
        utorange: "#BF5700",
      },
    },
  },
  plugins: [],
};
export default config;
