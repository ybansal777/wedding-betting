// Betting math + formatting helpers, shared across the app.

export const STARTING_BANKROLL = 100;

// Convert American odds (e.g. "+150", "-200") into a total-return multiplier.
// Returns the multiple of the wager you get BACK on a win, including your stake.
// +150 -> 2.5  (wager 10 returns 25),  -200 -> 1.5 (wager 10 returns 15).
export const americanToMultiplier = (odds) => {
  const num = parseInt(odds, 10);
  if (isNaN(num) || num === 0) return 1;
  return num > 0 ? 1 + num / 100 : 1 + 100 / Math.abs(num);
};

// Profit (not including stake) for a winning wager. Wager 10 at +150 -> +15 profit.
export const profitOnWin = (wager, odds) =>
  Math.round(wager * (americanToMultiplier(odds) - 1));

// Total returned on a win, including the stake. Wager 10 at +150 -> 25.
export const returnOnWin = (wager, odds) =>
  Math.round(wager * americanToMultiplier(odds));

// Whole-dollar display of the fake currency, e.g. "$100".
export const formatMoney = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));

// Given a guest's confirmed bets, compute their live balance.
// Unsettled bets only subtract the wager; settled bets add the return on a win.
export const balanceFor = (bets) =>
  bets.reduce((bal, b) => {
    const settled = b.winner === "A" || b.winner === "B";
    if (!settled) return bal - b.wager;
    return b.winner === b.pick
      ? bal - b.wager + returnOnWin(b.wager, b.odds_at_bet)
      : bal - b.wager;
  }, STARTING_BANKROLL);

// Group a flat list of bet rows into { name, balance, settled, pending } and
// sort for the leaderboard (highest balance first).
export const buildLeaderboard = (allBets) => {
  const byGuest = new Map();
  for (const b of allBets) {
    const key = b.guest_name.trim();
    if (!byGuest.has(key)) byGuest.set(key, []);
    byGuest.get(key).push(b);
  }
  return [...byGuest.entries()]
    .map(([name, bets]) => ({
      name,
      bets,
      balance: balanceFor(bets),
      settledCount: bets.filter((b) => b.winner).length,
    }))
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
};
