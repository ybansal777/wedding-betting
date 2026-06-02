import { useState } from "react";
import {
  americanToMultiplier,
  profitOnWin,
  returnOnWin,
  formatMoney,
} from "../lib/odds";

const QUICK = [5, 10, 25];

// One question with a variable list of options. Three lives:
//  1. open   — guest selects an option, sets a wager, reviews, and confirms (final).
//  2. locked — guest already has a confirmed bet on this question.
//  3. settled — admin set a winner; show win/loss (and result if guest sat out).
export default function BetCard({
  question: q,
  myBet,
  balance,
  nameReady,
  onConfirm,
  index = 0,
}) {
  const [pick, setPick] = useState(null); // selected option id
  const [wager, setWager] = useState(Math.min(10, Math.max(1, balance)));
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const options = Array.isArray(q.options) ? q.options : [];
  const settled = q.winner != null && q.winner !== "";
  const optById = (id) => options.find((o) => o.id === id) || null;
  const labelFor = (id, fallback) => optById(id)?.label ?? fallback ?? "—";

  // -------------------------------------------------- LOCKED / SETTLED (mine)
  if (myBet) {
    const won = settled && q.winner === myBet.pick;
    const lost = settled && q.winner !== myBet.pick;
    const ret = returnOnWin(myBet.wager, myBet.odds_at_bet);
    const myLabel = myBet.pick_label || labelFor(myBet.pick, "Your pick");
    return (
      <article
        className="card p-5 animate-slide-up"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <h3 className="font-serif text-2xl text-mauve-deep leading-snug">
          {q.prompt}
        </h3>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-cream-deep/70 px-4 py-3">
          <div>
            <p className="eyebrow text-mauve">Your pick</p>
            <p className="font-serif text-xl text-mauve-deep">{myLabel}</p>
            <p className="text-xs font-semibold text-mauve/70">
              {myBet.odds_at_bet} ·{" "}
              {americanToMultiplier(myBet.odds_at_bet).toFixed(2)}×
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow text-mauve">Wager</p>
            <p className="font-serif text-xl text-mauve-deep">
              {formatMoney(myBet.wager)}
            </p>
            <p className="text-xs font-semibold text-mauve/70">
              pays {formatMoney(ret)}
            </p>
          </div>
        </div>

        {!settled && (
          <p className="mt-3 text-sm text-mauve/80">
            Locked in — pays{" "}
            <span className="font-bold text-blush-deep">{formatMoney(ret)}</span>{" "}
            if it hits.
          </p>
        )}
        {won && (
          <div className="mt-3 rounded-2xl bg-sage/20 px-4 py-3 text-sage-deep animate-pop-in">
            <p className="font-serif text-lg">You won!</p>
            <p className="text-sm">
              +{formatMoney(profitOnWin(myBet.wager, myBet.odds_at_bet))} ·
              winner: {labelFor(q.winner)}
            </p>
          </div>
        )}
        {lost && (
          <div className="mt-3 rounded-2xl bg-blush-light/50 px-4 py-3 text-blush-deep">
            <p className="font-serif text-lg">So close.</p>
            <p className="text-sm">
              −{formatMoney(myBet.wager)} · winner: {labelFor(q.winner)}
            </p>
          </div>
        )}
      </article>
    );
  }

  // -------------------------------------------------- SETTLED, GUEST SAT OUT
  if (settled) {
    return (
      <article
        className="card p-5 opacity-90 animate-slide-up"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <h3 className="font-serif text-2xl text-mauve-deep leading-snug">
          {q.prompt}
        </h3>
        <p className="mt-3 text-sm text-mauve/80">
          Final answer:{" "}
          <span className="font-bold text-mauve-deep">{labelFor(q.winner)}</span>{" "}
          — you sat this one out.
        </p>
      </article>
    );
  }

  // -------------------------------------------------- OPEN (place a bet)
  const cappedWager = Math.min(wager, balance);
  const canBet = nameReady && balance > 0;
  const picked = optById(pick);

  const setWagerSafe = (v) =>
    setWager(Math.max(1, Math.min(Math.floor(v) || 1, balance)));

  return (
    <article
      className="card p-5 animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <h3 className="font-serif text-2xl text-mauve-deep leading-snug mb-4">
        {q.prompt}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const selected = pick === o.id;
          const mult = americanToMultiplier(o.odds);
          return (
            <button
              key={o.id}
              type="button"
              disabled={!canBet}
              onClick={() => {
                setPick(selected ? null : o.id);
                setConfirming(false);
              }}
              className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-200 active:scale-[0.97] disabled:opacity-50 ${
                selected
                  ? "border-blush bg-blush/10 shadow-soft"
                  : "border-blush/25 bg-cream/40 hover:border-blush/50"
              }`}
            >
              <span className="block font-serif text-lg text-mauve-deep leading-tight">
                {o.label}
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-cream-deep px-2 py-0.5 text-xs font-semibold text-mauve">
                  {o.odds}
                </span>
                <span className="rounded-full bg-blush/15 px-2 py-0.5 text-xs font-semibold text-blush-deep">
                  {mult.toFixed(2)}× payout
                </span>
              </span>
              {selected && (
                <span className="absolute right-2 top-2 text-blush-deep">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {!canBet && (
        <p className="mt-3 text-center text-sm text-mauve/70">
          {!nameReady
            ? "Enter your name above to start betting."
            : "You're out of money — ride out your open bets!"}
        </p>
      )}

      {/* wager + review */}
      {picked && canBet && !confirming && (
        <div className="mt-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-mauve">Wager</span>
            <span className="font-serif text-2xl text-mauve-deep">
              {formatMoney(cappedWager)}
            </span>
          </div>

          <input
            type="range"
            min="1"
            max={Math.max(1, balance)}
            value={cappedWager}
            onChange={(e) => setWagerSafe(Number(e.target.value))}
            className="mt-2 w-full accent-blush"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK.filter((a) => a <= balance).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setWagerSafe(a)}
                className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                  cappedWager === a
                    ? "border-blush bg-blush text-cream-card"
                    : "border-blush/30 text-mauve hover:bg-blush/10"
                }`}
              >
                {a}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setWagerSafe(balance)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                cappedWager === balance
                  ? "border-sage bg-sage text-cream-card"
                  : "border-sage/40 text-sage-deep hover:bg-sage/10"
              }`}
            >
              All in ({formatMoney(balance)})
            </button>
          </div>

          <p className="mt-3 rounded-2xl bg-cream-deep/60 px-4 py-3 text-sm text-mauve-deep">
            Bet <b>{formatMoney(cappedWager)}</b> on{" "}
            <b className="text-blush-deep">{picked.label}</b> → win{" "}
            <b className="text-sage-deep">
              {formatMoney(returnOnWin(cappedWager, picked.odds))}
            </b>{" "}
            <span className="text-mauve/70">
              (profit +{formatMoney(profitOnWin(cappedWager, picked.odds))})
            </span>
          </p>

          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="btn-primary mt-3 w-full py-3.5 text-base"
          >
            Review bet
          </button>
        </div>
      )}

      {/* confirmation — final */}
      {picked && canBet && confirming && (
        <div className="mt-4 rounded-2xl border-2 border-blush/40 bg-blush/5 p-4 animate-pop-in">
          <p className="text-center font-serif text-xl text-mauve-deep">
            Lock in {formatMoney(cappedWager)} on{" "}
            <span className="text-blush-deep">{picked.label}</span>?
          </p>
          <p className="mt-1 text-center text-sm text-mauve/80">
            Confirmed bets are <b>final</b> — you can't change them.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-2xl border-2 border-mauve/25 py-3 font-semibold text-mauve transition hover:bg-cream-deep/60 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const ok = await onConfirm(
                  q.id,
                  picked.id,
                  cappedWager,
                  picked.odds,
                  picked.label
                );
                if (!ok) {
                  setSaving(false);
                  setConfirming(false);
                }
              }}
              className="btn-primary flex-1 py-3 text-base"
            >
              {saving ? "Locking…" : "Lock it in"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
