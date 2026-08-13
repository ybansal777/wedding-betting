import Link from "next/link";

// Server-rendered on purpose. Organic search is a primary acquisition channel
// for a weddings-only product with a one-time purchase, and a client-rendered
// SPA hands crawlers an empty page — that was one of the three reasons for the
// Next.js port in the first place.

const STEPS = [
  {
    title: "Write your questions",
    body: "Start from a library of wedding questions — who cries first, who gives the longest speech — or write your own. Set the odds however you like.",
  },
  {
    title: "Share one QR code",
    body: "Guests scan it at the table. No app to install, no download, no setup on their end.",
  },
  {
    title: "Call the winners",
    body: "You or your maid of honour tap the winning answer as the night unfolds. Payouts land instantly and the leaderboard reshuffles on every phone.",
  },
];

// Two options, not three. A couple choosing between two paid tiers on their way
// to buying is a decision that costs conversions and buys nothing.
//
// Only list what actually works — an unbuilt feature in a pricing table is a
// promise you break after taking the money.
const TIERS = [
  {
    name: "Free",
    price: "$0",
    line: "Build the whole thing before you pay a penny.",
    features: [
      "15 guests",
      "5 questions",
      "Live leaderboard",
      "Classic theme",
    ],
    cta: "Start free",
  },
  {
    name: "Premium",
    price: "$39",
    line: "Everything, for one wedding.",
    features: [
      "Unlimited guests",
      "Unlimited questions",
      "All seven themes, including dark mode",
      "Any accent colour you like",
      "Your own logo or monogram",
      "Printable table cards",
      "Post-event recap page",
    ],
    cta: "Go Premium",
    featured: true,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24">
      <header className="pt-16 text-center sm:pt-24">
        <p className="eyebrow text-blush-deep">
          Play money · real bragging rights
        </p>
        <h1 className="mt-4 text-balance font-serif text-5xl leading-[1.05] text-mauve-deep sm:text-6xl">
          A live betting game for your wedding
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-mauve/90">
          Cocktail hour is long and half your guests have never met. Give them
          something to argue about: predictions on your own wedding, live odds,
          and a leaderboard that updates all night.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login" className="btn-primary px-8 py-4 text-lg">
            Set up your event
          </Link>
          <span className="text-sm text-mauve/70">
            Free to build. Pay once when you share it.
          </span>
        </div>
      </header>

      <div className="scallop-divider mx-auto my-16 max-w-sm">
        <span className="text-xs text-blush">✦</span>
      </div>

      <section aria-labelledby="how">
        <h2 id="how" className="text-center font-serif text-3xl text-mauve-deep">
          How it works
        </h2>
        {/* Numbered because this genuinely is a sequence — you cannot call
            winners before guests have joined. */}
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-5">
              <span className="eyebrow text-blush-deep">Step {i + 1}</span>
              <h3 className="mt-2 font-serif text-xl text-mauve-deep">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mauve/85">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pricing" className="mt-20">
        <h2
          id="pricing"
          className="text-center font-serif text-3xl text-mauve-deep"
        >
          One payment, one wedding
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-mauve/80">
          No subscription. Nobody needs a monthly plan for one night.
        </p>

        <div className="mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`card flex flex-col p-5 ${
                t.featured ? "ring-2 ring-blush/50" : ""
              }`}
            >
              <h3 className="font-serif text-2xl text-mauve-deep">{t.name}</h3>
              <p className="mt-1 font-serif text-4xl text-mauve-deep">
                {t.price}
              </p>
              <p className="mt-1 text-sm text-mauve/80">{t.line}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-mauve/85">
                {t.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`mt-5 block rounded-2xl py-3 text-center font-semibold ${
                  t.featured
                    ? "btn-primary"
                    : "border-2 border-mauve/25 text-mauve hover:bg-cream-deep/60"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq" className="mt-20">
        <h2 id="faq" className="text-center font-serif text-3xl text-mauve-deep">
          Questions people actually ask
        </h2>
        <dl className="mt-8 space-y-5">
          <div className="card p-5">
            <dt className="font-serif text-xl text-mauve-deep">
              Is this gambling?
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-mauve/85">
              No. Guests play with fake money, they never buy chips, and there is
              nothing to cash out. The only payment is the host buying the
              software. It is a prediction game for bragging rights.
            </dd>
          </div>
          <div className="card p-5">
            <dt className="font-serif text-xl text-mauve-deep">
              Do my guests need an app?
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-mauve/85">
              No. They scan a QR code and it opens in their browser. They do sign
              in — with Apple, Google, or email — so their bets follow them if
              their phone dies and they borrow someone else&apos;s.
            </dd>
          </div>
          <div className="card p-5">
            <dt className="font-serif text-xl text-mauve-deep">
              What if the venue wifi is terrible?
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-mauve/85">
              It is built for that. The app polls rather than holding a live
              connection open, so a dropped signal costs a guest a few seconds,
              not their session.
            </dd>
          </div>
          <div className="card p-5">
            <dt className="font-serif text-xl text-mauve-deep">
              Who runs it on the day?
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-mauve/85">
              Not you — you are getting married. Most couples hand the console to
              their maid of honour or best man. It works from a phone.
            </dd>
          </div>
        </dl>
      </section>

      <footer className="mt-20 text-center">
        <div className="scallop-divider mx-auto mb-4 max-w-xs">
          <span className="text-xs text-blush">✦</span>
        </div>
        <p className="text-sm text-mauve/70">
          Fake money · real bragging rights
        </p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-mauve/70">
          <Link href="/login" className="underline underline-offset-4">
            Host sign in
          </Link>
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy
          </Link>
          <Link href="/terms" className="underline underline-offset-4">
            Terms
          </Link>
        </p>
      </footer>
    </main>
  );
}
