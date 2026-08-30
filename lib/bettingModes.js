// Host picks one of these when they create the event. It decides which
// question types they can write and whether guests see prices.

export const BETTING_MODES = [
  {
    key: "casual",
    label: "Betting",
    kicker: "Even money",
    blurb:
      "Guests pick an answer and choose how much to wager. You can cap the stake on any question. No odds to set — a winning bet pays even money.",
  },
  {
    key: "live",
    label: "Live betting",
    kicker: "Sportsbook",
    blurb:
      "You set the price. Multiple choice with +150 / −110 style odds, or an Over/Under line. Cap the stake on any question if you want.",
  },
];

export const BETTING_MODE_KEYS = BETTING_MODES.map((m) => m.key);

export const DEFAULT_BETTING_MODE = "casual";

export function isLiveBetting(mode) {
  return mode === "live";
}
