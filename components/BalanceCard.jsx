"use client";

import { formatMoney } from "../lib/odds";

// Identity + live balance. Reads like a chip stack, not a bank statement.
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
  const barColor = up ? "bg-sage" : down ? "bg-blush" : "bg-gold";

  return (
    <section className="card relative overflow-hidden p-5 animate-slide-up">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gold/15 blur-2xl"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="eyebrow text-blush">Playing as</span>
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
        <span className="eyebrow text-mauve">Bankroll</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-blush/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-blush">
            {pendingCount} riding
          </span>
        )}
      </div>

      <div className="mt-1">
        <span
          className={`font-serif text-5xl font-extrabold tabular tracking-tight ${
            up ? "text-sage" : down ? "text-blush" : "text-gold"
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
