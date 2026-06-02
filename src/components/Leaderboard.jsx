import { formatMoney } from "../lib/odds";

// Live standings — a player only appears once they've bet on every question.
export default function Leaderboard({
  entries,
  currentName,
  totalQuestions = 0,
  myBetCount = null,
}) {
  // Hint for a logged-in guest who hasn't finished betting on everything yet.
  const remaining =
    myBetCount != null && totalQuestions > 0
      ? totalQuestions - myBetCount
      : 0;

  return (
    <section className="card p-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-mauve-deep">Leaderboard</h2>
        <span className="eyebrow text-mauve">
          {entries.length} player{entries.length === 1 ? "" : "s"}
        </span>
      </div>

      {remaining > 0 && (
        <p className="mt-2 rounded-xl bg-blush/10 px-3 py-2 text-center text-xs text-mauve-deep">
          You need to bet on {remaining} more question
          {remaining === 1 ? "" : "s"} to join the leaderboard.
        </p>
      )}

      <div className="scallop-divider my-4">
        <span className="text-blush text-xs">✦</span>
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-mauve/70">
          The leaderboard unlocks once players have bet on every question.
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
                    ? "bg-gradient-to-r from-gold/20 to-cream-card ring-1 ring-gold/40"
                    : isMe
                      ? "bg-blush/10 ring-1 ring-blush/30"
                      : "bg-cream-deep/40"
                }`}
              >
                <span
                  className={`w-7 shrink-0 text-center font-serif text-lg ${
                    i === 0 ? "text-gold" : "text-mauve"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-serif text-lg text-mauve-deep">
                  {e.name}
                  {isMe && (
                    <span className="ml-1.5 align-middle text-xs font-sans font-semibold uppercase tracking-wider text-blush-deep">
                      you
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-serif text-lg text-mauve-deep">
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
