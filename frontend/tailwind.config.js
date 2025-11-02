/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2bc1c6",
        secondary: "#9e68fc"
      }
    }
  },
  plugins: [],
};
