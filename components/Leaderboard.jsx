"use client";

import { formatMoney } from "../lib/odds";

const MEDAL = ["text-gold", "text-mauve", "text-blush-light"];

// Live standings — every player who has placed at least one bet appears.
export default function Leaderboard({ entries, currentName }) {
  return (
    <section className="card p-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl tracking-tight text-mauve-deep">
          Leaderboard
        </h2>
        <span className="eyebrow text-mauve">
          {entries.length} player{entries.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="scallop-divider my-4">
        <span className="text-xs text-gold">◆</span>
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-mauve/70">
          No bets yet — be the first to get on the board.
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((e, i) => {
            const isMe =
              currentName &&
              e.name.toLowerCase() === currentName.trim().toLowerCase();
            return (
              <li
                key={e.name}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                  i === 0
                    ? "bg-gold/15 ring-1 ring-gold/40"
                    : isMe
                      ? "bg-blush/15 ring-1 ring-blush/35"
                      : "bg-cream-deep/50"
                }`}
              >
                <span
                  className={`w-7 shrink-0 text-center font-mono text-lg tabular ${
                    MEDAL[i] || "text-mauve"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-serif text-lg text-mauve-deep">
                  {e.name}
                  {isMe && (
                    <span className="ml-1.5 align-middle font-sans text-xs font-semibold uppercase tracking-wider text-blush">
                      you
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-lg tabular text-mauve-deep">
                  {formatMoney(e.balance)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
