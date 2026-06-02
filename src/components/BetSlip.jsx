import { useState } from "react";
import { returnOnWin, formatMoney } from "../lib/odds";

// Floating drop-up bet slip. A circular button sits in the bottom-right; tapping
// it opens a panel ABOVE summarizing every staged bet, with a "Place Bets"
// button (and its confirmation step) underneath.
export default function BetSlip({ items, total, onRemove, onPlace }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [placing, setPlacing] = useState(false);

  if (items.length === 0) return null; // nothing staged → no slip

  const potential = items.reduce(
    (s, it) => s + returnOnWin(it.wager, it.odds),
    0
  );

  const place = async () => {
    setPlacing(true);
    const ok = await onPlace();
    setPlacing(false);
    if (ok) {
      setConfirming(false);
      setOpen(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {/* Drop-up panel */}
      {open && (
        <div className="mb-3 w-[min(22rem,calc(100vw-2.5rem))] origin-bottom-right animate-pop-in rounded-3xl border border-blush/20 bg-cream-card shadow-lift">
          <div className="flex items-center justify-between border-b border-mauve/10 px-5 py-3">
            <h3 className="font-serif text-xl text-mauve-deep">Your Bet Slip</h3>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close bet slip"
              className="text-mauve/60 hover:text-mauve"
            >
              ✕
            </button>
          </div>

          <ul className="max-h-[45vh] space-y-2 overflow-y-auto px-4 py-3">
            {items.map((it) => (
              <li
                key={it.questionId}
                className="rounded-2xl bg-cream-deep/40 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-xs text-mauve/70 line-clamp-1">
                    {it.prompt}
                  </p>
                  <button
                    onClick={() => onRemove(it.questionId)}
                    aria-label="Remove bet"
                    className="shrink-0 text-xs text-blush-deep underline underline-offset-2 hover:opacity-80"
                  >
                    remove
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-serif text-lg text-mauve-deep">
                    {it.label}{" "}
                    <span className="text-xs font-sans text-mauve/60">
                      ({it.odds})
                    </span>
                  </span>
                  <span className="text-right text-sm">
                    <span className="font-semibold text-mauve-deep">
                      {formatMoney(it.wager)}
                    </span>
                    <span className="block text-xs text-sage-deep">
                      → {formatMoney(returnOnWin(it.wager, it.odds))}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-mauve/10 px-5 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-mauve/80">
                Total staked
                <span className="ml-1 font-bold text-mauve-deep">
                  {formatMoney(total)}
                </span>
              </span>
              <span className="text-mauve/80">
                Could win
                <span className="ml-1 font-bold text-sage-deep">
                  {formatMoney(potential)}
                </span>
              </span>
            </div>

            {confirming ? (
              <div className="mt-3 rounded-2xl border-2 border-blush/40 bg-blush/5 p-3 animate-pop-in">
                <p className="text-center text-sm text-mauve-deep">
                  Place {items.length} bet{items.length === 1 ? "" : "s"} for{" "}
                  <b>{formatMoney(total)}</b>? Bets are <b>final</b>.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={placing}
                    className="flex-1 rounded-xl border-2 border-mauve/25 py-2.5 text-sm font-semibold text-mauve hover:bg-cream-deep/60 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={place}
                    disabled={placing}
                    className="btn-primary flex-1 py-2.5 text-sm"
                  >
                    {placing ? "Placing…" : "Confirm"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="btn-primary mt-3 w-full py-3 text-base"
              >
                Place Bets
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating circular toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Bet slip with ${items.length} bet${items.length === 1 ? "" : "s"}`}
        className="relative flex h-16 w-16 flex-col items-center justify-center rounded-full bg-gradient-to-br from-blush to-blush-deep text-cream-card shadow-lift transition active:scale-95"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90">
          Slip
        </span>
        <span className="font-serif text-xl leading-none">
          {formatMoney(total)}
        </span>
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-cream bg-mauve-deep px-1 text-xs font-bold text-cream-card">
          {items.length}
        </span>
      </button>
    </div>
  );
}
