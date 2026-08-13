"use client";

import { formatMoney } from "../lib/odds";

// Identity + live balance.
//
// The original version doubled as the login: a guest typed a name and pressed
// Enter. Identity now comes from a real authenticated guest row, so this is
// purely a display of who you are and what you're holding.
export default function BalanceCard({
  displayName,
  balance,
  bankroll = 100,
  pendingCount = 0,
  onRename,
}) {
  const pct = Math.max(0, Math.min(100, (balance / bankroll) * 100));
  const up = balance > bankroll;
  const down = balance < bankroll;
  const barColor = up ? "bg-sage" : down ? "bg-blush-deep" : "bg-mauve";

  return (
    <section className="card p-5 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="eyebrow text-blush-deep">Playing as</span>
          <p className="truncate font-serif text-2xl leading-tight text-mauve-deep">
            {displayName}
          </p>
        </div>
        {onRename && (
          <button
            type="button"
            onClick={onRename}
            className="mt-1 shrink-0 text-xs text-mauve/60 underline underline-offset-4 hover:text-mauve"
          >
            Change name
          </button>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between">
        <span className="eyebrow text-mauve">Total Balance</span>
        {pendingCount > 0 && (
          <span className="text-xs text-mauve/70">
            {pendingCount} bet{pendingCount > 1 ? "s" : ""} riding
          </span>
        )}
      </div>

      <div className="mt-1">
        <span
          className={`font-serif text-5xl font-semibold ${
            up ? "text-sage-deep" : down ? "text-blush-deep" : "text-mauve-deep"
          }`}
        >
          {formatMoney(balance)}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream-deep">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
