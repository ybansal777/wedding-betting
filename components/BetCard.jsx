"use client";

import {
  americanToMultiplier,
  profitOnWin,
  returnOnWin,
  formatMoney,
} from "../lib/odds";

const QUICK = [5, 10, 25];

// One question with a variable list of options. Three lives:
//  1. open   — guest picks an option and sets a wager; it's STAGED into the bet
//              slip (no confirm here). Balance updates live in the parent.
//  2. locked — guest already placed a confirmed bet on this question.
//  3. settled — admin set a winner; show win/loss (and result if guest sat out).
export default function BetCard({
  question: q,
  myBet,
  staged, // { optionId, wager, odds, label } | null
  maxWager, // most this question may stake right now
  nameReady,
  showOdds = false,
  onStage, // (questionId, optionId, odds, label)
  onWager, // (questionId, wager)
  onClear, // (questionId)
  index = 0,
}) {
  const options = Array.isArray(q.options) ? q.options : [];
  const settled = q.winner != null && q.winner !== "";
  const priced = showOdds || q.bet_type === "line";
  const optById = (id) => options.find((o) => o.id === id) || null;
  const labelFor = (id, fallback) => optById(id)?.label ?? fallback ?? "—";

  // -------------------------------------------------- LOCKED / SETTLED (mine)
  if (myBet) {
    const pushed = settled && q.winner === "push";
    const won = settled && !pushed && q.winner === myBet.pick;
    const lost = settled && !pushed && q.winner !== myBet.pick;
    const ret = returnOnWin(myBet.wager, myBet.odds_at_bet);
    const myLabel = myBet.pick_label || labelFor(myBet.pick, "Your pick");
    return (
      <article
        className="card p-5 animate-slide-up"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <h3 className="font-serif text-2xl leading-snug text-mauve-deep">
          {q.prompt}
        </h3>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-cream-deep/80 px-4 py-3 ring-1 ring-mauve-deep/10">
          <div>
            <p className="eyebrow text-mauve">Your pick</p>
            <p className="font-serif text-xl text-mauve-deep">{myLabel}</p>
            {priced && (
              <p className="font-mono text-xs font-semibold text-gold">
                {myBet.odds_at_bet} ·{" "}
                {americanToMultiplier(myBet.odds_at_bet).toFixed(2)}×
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="eyebrow text-mauve">Wager</p>
            <p className="font-serif text-xl tabular text-mauve-deep">
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
            <span className="font-bold text-blush">{formatMoney(ret)}</span> if
            it hits.
          </p>
        )}
        {won && (
          <div className="mt-3 animate-pop-in rounded-2xl bg-sage/20 px-4 py-3 text-sage-deep ring-1 ring-sage/40">
            <p className="font-serif text-lg">You won!</p>
            <p className="text-sm">
              +{formatMoney(profitOnWin(myBet.wager, myBet.odds_at_bet))} ·
              winner: {labelFor(q.winner)}
            </p>
          </div>
        )}
        {lost && (
          <div className="mt-3 rounded-2xl bg-blush/15 px-4 py-3 text-blush ring-1 ring-blush/30">
            <p className="font-serif text-lg">So close.</p>
            <p className="text-sm">
              −{formatMoney(myBet.wager)} · winner: {labelFor(q.winner)}
            </p>
          </div>
        )}
        {pushed && (
          <div className="mt-3 rounded-2xl bg-cream-deep/80 px-4 py-3 text-mauve-deep">
            <p className="font-serif text-lg">Push.</p>
            <p className="text-sm">
              Landed right on the line — your {formatMoney(myBet.wager)} wager
              was refunded.
            </p>
          </div>
        )}
      </article>
    );
  }

  // -------------------------------------------------- SETTLED, GUEST SAT OUT
  if (settled) {
    const resultText =
      q.winner === "push" ? `Push at ${q.actual_value}` : labelFor(q.winner);
    return (
      <article
        className="card p-5 animate-slide-up opacity-90"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <h3 className="font-serif text-2xl leading-snug text-mauve-deep">
          {q.prompt}
        </h3>
        <p className="mt-3 text-sm text-mauve/80">
          Final answer:{" "}
          <span className="font-bold text-mauve-deep">{resultText}</span> — you
          sat this one out.
        </p>
      </article>
    );
  }

  // -------------------------------------------------- OPEN (stage a bet)
  const picked = staged ? optById(staged.optionId) : null;
  const wager = staged?.wager || 0;
  const outOfMoney = !staged && maxWager < 1;
  const sliderMax = Math.max(1, maxWager);
  const cols = options.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <article
      className="card p-5 animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <h3 className="font-serif text-2xl leading-snug text-mauve-deep">
        {q.prompt}
      </h3>
      {q.max_wager != null && (
        <p className="mt-1 text-xs font-semibold text-mauve/70">
          Max wager {formatMoney(q.max_wager)}
        </p>
      )}
      <div className="mt-4" />

      <div className={`grid ${cols} gap-2.5`}>
        {options.map((o) => {
          const selected = staged?.optionId === o.id;
          const mult = priced ? americanToMultiplier(o.odds) : null;
          const disabled = !nameReady || (!selected && outOfMoney);
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() =>
                selected
                  ? onClear(q.id)
                  : onStage(q.id, o.id, o.odds, o.label)
              }
              className={`odds-tile ${selected ? "is-picked" : ""}`}
            >
              <span className="block font-serif text-base leading-tight text-mauve-deep sm:text-lg">
                {o.label}
              </span>
              {priced && (
                <span className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`font-mono text-sm tabular ${
                      selected ? "text-blush" : "text-gold"
                    }`}
                  >
                    {o.odds}
                  </span>
                  <span className="rounded-full bg-cream/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-mauve">
                    {mult.toFixed(2)}×
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!nameReady && (
        <p className="mt-3 text-center text-sm text-mauve/70">
          Enter your name above to start betting.
        </p>
      )}
      {nameReady && outOfMoney && (
        <p className="mt-3 text-center text-sm text-mauve/70">
          You&apos;re out of money — adjust your other bets to free some up.
        </p>
      )}

      {picked && (
        <div className="mt-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-mauve">Wager</span>
            <span className="font-serif text-2xl tabular text-mauve-deep">
              {formatMoney(wager)}
            </span>
          </div>

          <input
            type="range"
            min="1"
            max={sliderMax}
            value={Math.min(wager, sliderMax)}
            onChange={(e) => onWager(q.id, Number(e.target.value))}
            className="mt-3 w-full"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK.filter((a) => a <= maxWager).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onWager(q.id, a)}
                className={`rounded-full border px-3.5 py-1.5 font-mono text-sm font-semibold transition ${
                  wager === a
                    ? "border-blush bg-blush text-foam"
                    : "border-blush/30 text-mauve-deep hover:bg-blush/10"
                }`}
              >
                {a}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onWager(q.id, maxWager)}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-sm font-semibold transition ${
                wager === maxWager
                  ? "border-sage bg-sage text-foam"
                  : "border-sage/40 text-sage hover:bg-sage/10"
              }`}
            >
              Max {formatMoney(maxWager)}
            </button>
            <button
              type="button"
              onClick={() => onClear(q.id)}
              className="ml-auto rounded-full border border-mauve/25 px-3.5 py-1.5 text-sm font-semibold text-mauve transition hover:bg-cream-deep/60"
            >
              Remove
            </button>
          </div>

          <p className="mt-3 rounded-2xl bg-cream-deep/70 px-4 py-3 text-sm text-mauve-deep ring-1 ring-mauve-deep/10">
            Bet <b>{formatMoney(wager)}</b> on{" "}
            <b className="text-blush">{picked.label}</b> → win{" "}
            <b className="text-sage">
              {formatMoney(returnOnWin(wager, picked.odds))}
            </b>{" "}
            <span className="text-mauve/70">
              (profit +{formatMoney(profitOnWin(wager, picked.odds))})
            </span>
          </p>

          <p className="mt-2 text-center text-xs text-mauve/70">
            Added to your bet slip — review &amp; place it below.
          </p>
        </div>
      )}
    </article>
  );
}
