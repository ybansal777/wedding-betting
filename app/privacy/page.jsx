import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description:
    "What Wedding Bets stores about hosts and guests, why, and how to delete it.",
};

// Written to be read, not to be survived. A guest at a reception who taps this
// deserves a straight answer in the ten seconds they'll give it.
//
// NOT LEGAL ADVICE — this is an honest description of what the code actually
// does, and it needs a lawyer's review before launch. Placeholders are marked.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-14">
      <Link
        href="/"
        className="text-sm text-mauve underline underline-offset-4 hover:text-mauve-deep"
      >
        ← Back
      </Link>

      <h1 className="mt-4 font-serif text-4xl text-mauve-deep">Privacy</h1>
      <p className="mt-2 text-sm text-mauve/70">Last updated 13 August 2026</p>

      <div className="mt-8 space-y-6 leading-relaxed text-mauve/90">
        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">
            The short version
          </h2>
          <p className="mt-2">
            We store the least we can get away with: a way to sign you in, the
            name you chose to show other guests, and the bets you placed. We do
            not sell anything to anyone, and there are no advertising trackers on
            the pages your guests load.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">
            If you&apos;re a guest
          </h2>
          <p className="mt-2">We hold:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Your email address or phone number</strong>, or an
              identifier from Google if you signed in that way. This exists so
              your bets survive a dead phone and a browser refresh.
            </li>
            <li>
              <strong>The display name you chose.</strong> Other guests at that
              wedding can see it on the leaderboard, along with your play-money
              balance. Choose accordingly.
            </li>
            <li>
              <strong>Your bets</strong> — what you picked, how much you staked,
              and when.
            </li>
            <li>
              <strong>A random id stored in your browser</strong>, used only to
              count how many people who scanned the code went on to play. It is
              not linked to your identity and is not an advertising cookie.
            </li>
          </ul>
          <p className="mt-3">
            The couple hosting your wedding can see your display name, balance,
            and bets. They cannot see your email address or phone number.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">
            If you&apos;re a host
          </h2>
          <p className="mt-2">
            We hold your email address, your event details and questions, and a
            record of any payment. Card details go straight to Stripe — they
            never touch our servers.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">
            How long we keep it
          </h2>
          <p className="mt-2">
            Event data is kept for <strong>12 months</strong> after the wedding
            date so couples can revisit the results, then deleted. You can delete
            yours sooner at any time.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">
            Deleting your data
          </h2>
          <p className="mt-2">
            Go to{" "}
            <Link href="/account" className="underline underline-offset-4">
              your account
            </Link>{" "}
            and choose Delete. It removes your sign-in record, your guest
            profiles, your bets, and any events you host, permanently and
            immediately. There is no soft-delete and no recovery.
          </p>
          <p className="mt-2">
            If you cannot sign in, email{" "}
            <span className="font-mono text-sm">privacy@example.com</span>{" "}
            <em>(placeholder — set a real address before launch)</em> and we will
            do it for you.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">Who else sees it</h2>
          <p className="mt-2">
            Three processors, and no one else: <strong>Supabase</strong>{" "}
            (database and sign-in), <strong>Vercel</strong> (hosting), and{" "}
            <strong>Stripe</strong> (payments, hosts only). We do not sell or
            share personal data for advertising.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-mauve-deep">Your rights</h2>
          <p className="mt-2">
            Depending on where you live, you may have the right to access,
            correct, export, or delete your data, and to object to processing.
            The account page covers access and deletion directly; for anything
            else, email the address above.
          </p>
        </section>

        <p className="rounded-xl bg-blush/10 p-4 text-sm">
          <strong>Note for the operator:</strong> this page describes what the
          code does today and is not a substitute for legal review. Before launch
          you need a real contact address, a named data controller, and a
          lawyer&apos;s pass — particularly on GDPR and CCPA obligations, which
          apply because guest accounts are mandatory.
        </p>
      </div>
    </main>
  );
}
