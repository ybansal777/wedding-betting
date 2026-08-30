"use client";

import { useState } from "react";
import { useToast } from "./Toast";

const money = (cents) => `$${Math.round(cents / 100)}`;

// Upgrade surface for the host console.
//
// One paid tier, so there is no comparison table and no decision to make beyond
// yes or not yet. The PRD's hard rule is that a paywall never fires mid-event,
// so this is framed as "raise your limits before you share", never as a block
// on play.
export default function UpgradePanel({
  event,
  tiers = [],
  guestCount,
  questionCount,
}) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);

  const premium = tiers.find((t) => t.key === "premium");
  const isPremium = event.tier === "premium";

  const checkout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, tier: "premium" }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 503) {
        notify("Payments aren't switched on yet.", { tone: "error" });
        return;
      }
      if (!res.ok || !json.url) {
        notify(json.detail || "Couldn't start checkout. Try again.", {
          tone: "error",
        });
        return;
      }
      window.location.assign(json.url);
    } catch {
      notify("Couldn't reach the payment page. Check your connection.", {
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  if (isPremium) {
    return (
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Your plan</h2>
        <p className="mt-1 text-sm text-mauve/80">
          You&apos;re on <strong>Premium</strong> — every theme, colour and
          feature is unlocked for this event.
        </p>
      </section>
    );
  }

  if (!premium) return null;

  const nearGuestCap = guestCount >= event.max_guests * 0.8;
  const nearQuestionCap = questionCount >= event.max_questions * 0.8;

  return (
    <section className="card p-5 ring-2 ring-blush/40">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl text-mauve-deep">Go Premium</h2>
        <span className="font-serif text-3xl text-mauve-deep">
          {money(premium.price_cents)}
        </span>
      </div>
      <p className="mt-1 text-xs text-mauve/70">
        One payment for this event. Never a subscription, nothing to cancel.
      </p>

      {(nearGuestCap || nearQuestionCap) && (
        <p className="mt-3 rounded-xl bg-blush/10 p-3 text-sm text-mauve-deep">
          Heads up — you&apos;re close to your{" "}
          {nearGuestCap ? "guest" : "question"} limit ({guestCount}/
          {event.max_guests} guests, {questionCount}/{event.max_questions}{" "}
          questions). Worth upgrading before you share the link — limits only
          apply while you set up, never mid-reception.
        </p>
      )}

      <ul className="mt-4 space-y-1.5 text-sm text-mauve/85">
        <li>· Unlimited guests and questions</li>
        <li>· All seven themes, including dark mode</li>
        <li>· Any accent colour you like</li>
        <li>· Your own logo and your own link</li>
        <li>· Post-event recap page to share</li>
        <li>· Download every result as a spreadsheet</li>
      </ul>

      <button
        type="button"
        onClick={checkout}
        disabled={busy}
        className="btn-primary mt-4 w-full py-3.5"
      >
        {busy ? "Opening checkout…" : `Upgrade for ${money(premium.price_cents)}`}
      </button>
      <p className="mt-2 text-center text-xs text-mauve/60">
        Your questions, guests and bets stay exactly as they are.
      </p>
    </section>
  );
}
