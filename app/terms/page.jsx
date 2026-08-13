import Link from "next/link";

export const metadata = {
  title: "Terms",
  description:
    "Terms of use for Wedding Bets — a play-money prediction game with no cash prizes.",
};

// The "is this gambling" section is the commercially load-bearing part of this
// page: it is what a payment processor, an app store reviewer, or a nervous
// relative will read. It states the three facts that keep this a game.
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-14">
      <Link
        href="/"
        className="text-sm text-mauve underline underline-offset-4 hover:text-mauve-deep"
      >
        ← Back
      </Link>

      <h1 className="mt-4 font-serif text-4xl text-mauve-deep">Terms of use</h1>
      <p className="mt-2 text-sm text-mauve/70">Last updated 13 August 2026</p>

      <div className="mt-8 space-y-6 leading-relaxed text-mauve/90">
        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">
            This is not gambling
          </h2>
          <p className="mt-2">Three facts, and all three always hold:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Guests never pay anything.</strong> There is no entry fee,
              no buy-in, and nothing to purchase. Coins are issued free and have
              no value.
            </li>
            <li>
              <strong>Nothing can be cashed out.</strong> Balances are a score.
              They cannot be redeemed, transferred, or exchanged for anything.
            </li>
            <li>
              <strong>There is no prize pool.</strong> The only money that
              changes hands is a host buying the software, once, from us.
            </li>
          </ul>
          <p className="mt-3">
            Using this to run a real-money pool — collecting stakes from guests
            or paying out cash to a winner — is a breach of these terms and will
            get the event closed. It may also be illegal where you are.
            Don&apos;t.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">
            Hosts are responsible for their events
          </h2>
          <p className="mt-2">
            You write your own questions, so you own what they say. Keep them
            good-natured. Anything harassing, defamatory, or aimed at humiliating
            a named person is not acceptable, and we may remove an event for it.
          </p>
          <p className="mt-2">
            Sharing your login with the person running the console on the day is
            expected and fine — but you remain responsible for what they do with
            it.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">Payments</h2>
          <p className="mt-2">
            Paid tiers are a one-time charge per event, not a subscription.
            Nothing recurs and there is nothing to cancel.
          </p>
          <p className="mt-2">
            <strong>Refunds:</strong> if the product fails on your wedding day,
            you get your money back — no argument, no process. Outside that,
            email us before the event and we&apos;ll sort it out.{" "}
            <em>
              (Operator: confirm this policy with a lawyer and set a real contact
              address.)
            </em>
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">
            What we don&apos;t promise
          </h2>
          <p className="mt-2">
            The service is provided as-is. We work hard to keep it up on a
            Saturday evening, but we can&apos;t guarantee an uninterrupted
            service, and our liability is limited to what you paid for the event.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">Age</h2>
          <p className="mt-2">
            You need to be 16 or older to create an account, host or guest.
          </p>
        </section>

        <p className="rounded-xl bg-blush/10 p-4 text-sm">
          <strong>Note for the operator:</strong> this is a plain-language draft
          reflecting how the product actually works, not a lawyer-reviewed
          contract. Get it reviewed before you take a single payment — the
          gambling-adjacent framing makes that more important here than for a
          typical app.
        </p>
      </div>
    </main>
  );
}
