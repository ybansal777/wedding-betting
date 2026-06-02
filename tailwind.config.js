/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette pulled from the couple's wardrobe-guide graphic.
        cream: {
          DEFAULT: "#FAF5E9", // page background
          deep: "#F3EAD6", // recessed surfaces
          card: "#FFFDF7", // raised cards
        },
        blush: {
          light: "#F0D5D8",
          DEFAULT: "#D99CA6",
          deep: "#C27C88",
        },
        mauve: {
          light: "#B9A9BE",
          DEFAULT: "#9B8AA0",
          deep: "#6B4E5E", // headings / logo ink
        },
        sage: {
          light: "#C7CFB8",
          DEFAULT: "#A3B18A",
          deep: "#7E8C66",
        },
        gold: "#C9A24B",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Mulish"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(107, 78, 94, 0.25)",
        lift: "0 18px 50px -18px rgba(107, 78, 94, 0.35)",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: "translateY(18px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        popIn: {
          "0%": { opacity: 0, transform: "scale(0.92)" },
          "60%": { transform: "scale(1.03)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        sheen: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out both",
        "slide-up": "slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pop-in": "popIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
