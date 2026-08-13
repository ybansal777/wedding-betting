/** @type {import('tailwindcss').Config} */

// Colors resolve through CSS custom properties so a Host can re-theme their own
// event at runtime without a rebuild. The channel-triple form
// (`rgb(var(--x) / <alpha-value>)`) is what keeps opacity utilities like
// `bg-blush/10` and `text-mauve/70` working — those are used throughout the
// ported components, so this shape is load-bearing, not stylistic.
const themed = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: themed("--c-cream"),
          deep: themed("--c-cream-deep"),
          card: themed("--c-cream-card"),
        },
        blush: {
          light: themed("--c-blush-light"),
          DEFAULT: themed("--c-blush"),
          deep: themed("--c-blush-deep"),
        },
        mauve: {
          light: themed("--c-mauve-light"),
          DEFAULT: themed("--c-mauve"),
          deep: themed("--c-mauve-deep"),
        },
        sage: {
          light: themed("--c-sage-light"),
          DEFAULT: themed("--c-sage"),
          deep: themed("--c-sage-deep"),
        },
        gold: themed("--c-gold"),
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgb(var(--c-shadow) / 0.25)",
        lift: "0 18px 50px -18px rgb(var(--c-shadow) / 0.35)",
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
