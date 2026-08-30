"use client";

import { useEffect } from "react";

// The most important error boundary in the app.
//
// This is the one a guest hits, on their phone, at the event, while the host
// is watching. Without it Next.js shows its own error page — a stark
// developer screen that reads as "the host's app is broken".
//
// It deliberately does not explain what went wrong. A guest cannot act on a
// stack trace; they can act on "try again".
export default function EventError({ error, reset }) {
  useEffect(() => {
    // Surfaces in the platform logs with the digest, so a host reporting "it
    // broke during the speeches" can be traced to an actual error.
    console.error("[guest surface]", error?.digest ?? "", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="card w-full p-8">
        <p className="eyebrow text-blush-deep">One moment</p>
        <h1 className="mt-3 font-serif text-3xl text-mauve-deep">
          That didn&apos;t load properly
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mauve/85">
          Venue wifi is often the culprit. Your bets are safe — they&apos;re
          saved the moment you place them, not when the page loads.
        </p>

        <div className="scallop-divider my-5">
          <span className="text-xs text-gold">◆</span>
        </div>

        <button onClick={reset} className="btn-primary w-full py-3">
          Try again
        </button>
        <a
          href="/"
          className="mt-3 block text-sm text-mauve underline underline-offset-4"
        >
          Back to the front page
        </a>
      </div>
    </main>
  );
}
