// App masthead: circular monogram logo, couple's names in display serif,
// the date, and a one-line tagline that sets the playful tone.

export default function Header() {
  return (
    <header className="text-center pt-6 pb-2 animate-fade-in">
      <div className="mb-4 inline-block">
        <div className="rounded-full bg-cream-card p-1.5 shadow-soft ring-1 ring-blush/30">
          <img
            src="/logo-w-names.png"
            alt="Nikesh & Richa monogram"
            className="w-24 h-24 rounded-full object-cover"
          />
        </div>
      </div>

      <h1 className="font-serif text-4xl leading-tight text-mauve-deep">
        Nikesh <span className="text-blush">&amp;</span> Richa's
        <br />
        Wedding Bets
      </h1>

      <div className="scallop-divider mx-auto mt-4 w-48">
        <span className="text-blush text-xs">✦</span>
      </div>

      <p className="text-sm text-mauve/90 mt-3 max-w-xs mx-auto leading-relaxed">
        You've got <span className="font-bold text-blush-deep">$100</span>. Place
        your bets and climb the leaderboard to earn some bragging rights.
      </p>
    </header>
  );
}
