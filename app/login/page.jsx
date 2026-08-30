import Link from "next/link";
import AuthPanel from "../../components/AuthPanel";

export const metadata = { title: "Host sign in" };

export default function LoginPage({ searchParams }) {
  const next = searchParams?.next || "/dashboard";

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-5 px-4 py-10">
      <p className="text-center">
        <Link
          href="/"
          className="font-serif text-2xl tracking-tight text-mauve-deep"
        >
          Let&apos;s Bet
        </Link>
      </p>
      <AuthPanel
        mode="host"
        redirectTo={next}
        title="Host sign in"
        subtitle="Create your event, write your questions, run the game."
      />
      <p className="text-center text-sm text-mauve/70">
        <Link href="/" className="underline underline-offset-4 hover:text-mauve">
          ← Back to the front page
        </Link>
      </p>
    </main>
  );
}
