import { useState } from "react";
import { STARTING_BANKROLL, formatMoney } from "../lib/odds";

// Identity + live balance. The guest types a name and presses Enter to "log in"
// — typing alone does nothing. The name locks once they have a confirmed bet.

export default function BalanceCard({
  name,
  onChangeName,
  balance,
  nameLocked,
  pendingCount,
}) {
  const [draft, setDraft] = useState(name);
  const loggedIn = name.trim().length > 0;

  const submit = () => {
    const v = draft.trim();
    if (v) onChangeName(v);
  };

  const pct = Math.max(0, Math.min(100, (balance / STARTING_BANKROLL) * 100));
  const up = balance > STARTING_BANKROLL;
  const down = balance < STARTING_BANKROLL;
  const barColor = up ? "bg-sage" : down ? "bg-blush-deep" : "bg-mauve";

  return (
    <section className="card p-5 animate-slide-up">
      {!loggedIn ? (
        <div>
          <span className="eyebrow text-blush-deep">Your name</span>
          <div className="mt-2 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-2xl border border-blush/40 bg-cream/60 px-4 py-3 text-lg font-serif text-mauve-deep placeholder:text-mauve/40 focus:outline-none focus:ring-2 focus:ring-blush/50"
              placeholder="e.g. Auntie Priya"
              value={draft}
              maxLength={28}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoComplete="name"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              className="btn-primary shrink-0 px-5 text-base"
            >
              Enter
            </button>
          </div>
          <p className="mt-2 text-xs text-mauve/70">
            Pick a name your friends will recognize on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="eyebrow text-blush-deep">Playing as</span>
            <p className="font-serif text-2xl text-mauve-deep leading-tight">
              {name}
            </p>
          </div>
          {!nameLocked && (
            <button
              type="button"
              onClick={() => onChangeName("")}
              className="mt-1 shrink-0 text-xs text-mauve/60 underline underline-offset-4 hover:text-mauve"
            >
              Change name
            </button>
          )}
        </div>
      )}

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
