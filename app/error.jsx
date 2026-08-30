"use client";

import { useEffect } from "react";

// Root error boundary — the host console, dashboard and marketing pages.
// The guest surface has its own at app/e/[slug]/error.jsx, because a guest at a
// reception needs different words than a host at a laptop.
export default function RootError({ error, reset }) {
  useEffect(() => {
    console.error("[app]", error?.digest ?? "", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="card w-full p-8">
        <p className="eyebrow text-blush-deep">Something broke</p>
        <h1 className="mt-3 font-serif text-3xl text-mauve-deep">
          We hit an error
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mauve/85">
          Your event, questions and guests are all saved — nothing here is lost.
        </p>
        {error?.digest && (
          <p className="mt-3 font-mono text-xs text-mauve/60">
            Reference: {error.digest}
          </p>
        )}

        <div className="scallop-divider my-5">
          <span className="text-xs text-gold">◆</span>
        </div>

        <button onClick={reset} className="btn-primary w-full py-3">
          Try again
        </button>
        <a
          href="/dashboard"
          className="mt-3 block text-sm text-mauve underline underline-offset-4"
        >
          Back to your events
        </a>
      </div>
    </main>
  );
}
