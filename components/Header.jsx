import { formatMoney } from "../lib/odds";

// Event masthead. Identity first — logo, then the name — with the live
// status as a small chip underneath, not wedged between them.
export default function Header({
  title,
  subtitle,
  logoUrl,
  bankroll = 100,
  compact = false,
}) {
  return (
    <header
      className={`animate-fade-in text-center ${compact ? "pb-0 pt-3" : "pb-1 pt-6"}`}
    >
      {logoUrl && (
        <div
          className={`mx-auto overflow-hidden rounded-full bg-cream-card shadow-glow ring-2 ring-blush/35 ${
            compact ? "mb-3 h-16 w-16 p-1" : "mb-4 h-20 w-20 p-1"
          }`}
        >
          {/* Host-uploaded artwork of unknown dimensions — a plain <img>
              avoids a layout pass we don't need for one decorative badge. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        </div>
      )}

      <h1
        className={`font-serif font-extrabold leading-[1.05] tracking-tight text-mauve-deep ${
          compact ? "text-3xl" : "text-4xl"
        }`}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm font-semibold text-blush">{subtitle}</p>
      )}

      <p className="eyebrow mt-3 inline-flex items-center gap-2 text-sage">
        <span className="live-dot" />
        The house is open
      </p>

      <div className="scallop-divider mx-auto mt-3 w-40">
        <span className="text-xs text-gold">◆</span>
      </div>

      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-mauve/90">
        You&apos;ve got{" "}
        <span className="font-bold tabular text-gold">{formatMoney(bankroll)}</span>
        . Place your bets and climb the leaderboard.
      </p>
    </header>
  );
}
