/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        ink: "#202124",
        pearl: "#f7f7f4",
        sage: "#5f7f68",
        coral: "#c85f4a",
        skyglass: "#d9edf2"
      },
      boxShadow: {
        lens: "0 24px 80px rgba(32, 33, 36, 0.18)"
      }
    }
  },
  plugins: []
};
