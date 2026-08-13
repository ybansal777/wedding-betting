import { formatMoney } from "../lib/odds";

// Event masthead: optional logo, the couple's names in display serif, and a
// one-line tagline. Everything here used to be hardcoded to one wedding; it is
// now driven entirely by the event row so any Host gets their own.
export default function Header({
  title,
  partnerA,
  partnerB,
  logoUrl,
  bankroll = 100,
}) {
  const hasPair = partnerA && partnerB;

  return (
    <header className="text-center pt-6 pb-2 animate-fade-in">
      {logoUrl && (
        <div className="mb-4 inline-block">
          <div className="rounded-full bg-cream-card p-1.5 shadow-soft ring-1 ring-blush/30">
            {/* Host-uploaded artwork of unknown dimensions — a plain <img>
                avoids a layout pass we don't need for one decorative badge. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className="h-24 w-24 rounded-full object-cover"
            />
          </div>
        </div>
      )}

      <h1 className="font-serif text-4xl leading-tight text-mauve-deep">
        {hasPair ? (
          <>
            {partnerA} <span className="text-blush">&amp;</span> {partnerB}
            <br />
            {title}
          </>
        ) : (
          title
        )}
      </h1>

      <div className="scallop-divider mx-auto mt-4 w-48">
        <span className="text-blush text-xs">✦</span>
      </div>

      <p className="text-sm text-mauve/90 mt-3 max-w-xs mx-auto leading-relaxed">
        You&apos;ve got{" "}
        <span className="font-bold text-blush-deep">{formatMoney(bankroll)}</span>
        . Place your bets and climb the leaderboard to earn some bragging rights.
      </p>
    </header>
  );
}
