import Link from "next/link";
import DemoBoard from "../components/DemoBoard";

// Server-rendered on purpose. Organic search is a primary acquisition channel
// for an events product with a one-time purchase, and a client-rendered SPA
// hands crawlers an empty page — that was one of the three reasons for the
// Next.js port in the first place. DemoBoard is the only client island.

const STEPS = [
  {
    title: "Write your questions",
    body: "Pick Betting (even-money multiple choice, optional max wager) or Live betting (you set the odds, plus Over/Under). Then write your own questions or start from a template.",
  },
  {
    title: "Share one QR code",
    body: "Guests scan it at the table. No app to install, no download, no setup on their end.",
  },
  {
    title: "Call the winners",
    body: "Whoever's got the phone taps the winning answer as the night unfolds. Payouts land instantly and the leaderboard reshuffles on every phone.",
  },
];

const TIERS = [
  {
    name: "Free",
    price: "$0",
    line: "Build the whole thing before you pay a penny.",
    features: [
      "15 guests",
      "5 questions",
      "Live leaderboard",
      "Classic & Game Night themes",
    ],
    cta: "Start free",
  },
  {
    name: "Premium",
    price: "$39",
    line: "Everything, for one event.",
    features: [
      "Unlimited guests",
      "Unlimited questions",
      "All six themes, including dark mode",
      "Any accent colour you like",
      "Your own logo or monogram",
      "Your own link",
      "Printable table cards",
      "Post-event recap page",
      "Download every result",
    ],
    cta: "Go Premium",
    featured: true,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24">
      <nav className="flex items-center justify-between pt-6">
        <Link
          href="/"
          className="font-serif text-xl tracking-tight text-mauve-deep"
        >
          Let&apos;s Bet
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost px-4 py-2 text-sm">
            Host sign in
          </Link>
        </div>
      </nav>

      <section className="grid items-center gap-10 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <header>
          <p className="eyebrow flex items-center gap-2 text-blush">
            <span className="live-dot" />
            Play money · real bragging rights
          </p>
          <h1 className="mt-4 text-balance font-serif text-5xl font-extrabold leading-[0.95] tracking-tight text-mauve-deep sm:text-6xl lg:text-7xl">
            A betting board for the party.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-mauve/90">
            Wedding, bachelor night, birthday, reunion — anything with a crowd
            and a bit of chaos. Guests get chips, pick what happens next, and
            fight for the leaderboard all night.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="btn-primary px-8 py-4 text-center text-lg"
            >
              Open the house
            </Link>
            <span className="text-sm text-mauve/70 sm:ml-1">
              Free to build. Pay once when you share it.
            </span>
          </div>
        </header>

        <DemoBoard />
      </section>

      <div className="scallop-divider mx-auto my-16 max-w-sm">
        <span className="text-xs text-gold">◆</span>
      </div>

      <section aria-labelledby="how">
        <h2
          id="how"
          className="text-center font-serif text-3xl tracking-tight text-mauve-deep"
        >
          How it works
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-5">
              <span className="font-mono text-3xl tabular text-blush/80">
                0{i + 1}
              </span>
              <h3 className="mt-3 font-serif text-xl text-mauve-deep">
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
          className="text-center font-serif text-3xl tracking-tight text-mauve-deep"
        >
          One payment, one event
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-mauve/80">
          No subscription. Nobody needs a monthly plan for one night.
        </p>

        <div className="mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`card flex flex-col p-5 ${
                t.featured ? "shadow-glow ring-2 ring-blush/60" : ""
              }`}
            >
              {t.featured && (
                <span className="eyebrow mb-2 text-blush">Most hosts pick this</span>
              )}
              <h3 className="font-serif text-2xl text-mauve-deep">{t.name}</h3>
              <p className="mt-1 font-serif text-4xl tabular text-mauve-deep">
                {t.price}
              </p>
              <p className="mt-1 text-sm text-mauve/80">{t.line}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-mauve/85">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-sage">▸</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`mt-5 block rounded-2xl py-3 text-center font-semibold ${
                  t.featured
                    ? "btn-primary"
                    : "border-2 border-mauve/25 text-mauve-deep hover:bg-cream-deep/60"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq" className="mt-20">
        <h2
          id="faq"
          className="text-center font-serif text-3xl tracking-tight text-mauve-deep"
        >
          Questions people actually ask
        </h2>
        <dl className="mx-auto mt-8 max-w-2xl space-y-4">
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
              in — with Google, a text message, or email — so their bets follow
              them if their phone dies and they borrow someone else&apos;s.
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
              Probably not you — you&apos;re busy hosting. Most hosts hand the
              console to a friend or co-host. It works from a phone.
            </dd>
          </div>
        </dl>
      </section>

      <footer className="mt-20 text-center">
        <div className="scallop-divider mx-auto mb-4 max-w-xs">
          <span className="text-xs text-gold">◆</span>
        </div>
        <p className="font-serif text-lg text-mauve-deep">
          Fake money · real bragging rights
        </p>
        <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-mauve/70">
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
