import Stripe from "stripe";

const KEY = process.env.STRIPE_SECRET_KEY;

export const isStripeConfigured = Boolean(KEY);

// Lazily constructed so the app still boots (and the free tier still works)
// before Stripe is wired up.
export const stripe = KEY ? new Stripe(KEY) : null;

// Prices live in the database (`public.tiers`) so the webhook and the UI can't
// drift. This map only describes the line item to Stripe at checkout.
// The checkout route validates the requested tier against these keys, so this
// object is also the allow-list of what can be purchased.
export const TIER_COPY = {
  premium: {
    name: "Let's Bet — Premium",
    description:
      "Unlimited guests and questions, all themes including dark mode, custom colours, your logo, and a recap page. One payment for one event.",
  },
};
