"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinEvent } from "../lib/actions";
import { track, EVENTS } from "../lib/analytics";
import { useToast } from "./Toast";

// The last step before playing. Kept to a single field on purpose — the guest
// has already authenticated, and every extra tap here is a chance to lose them.
export default function GuestNameForm({
  slug,
  eventId,
  who,
  bankroll,
  suggested,
}) {
  const notify = useToast();
  const router = useRouter();
  const [name, setName] = useState(suggested || "");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await joinEvent(slug, name);
      if (!res.ok) return notify(res.error, { tone: "error" });
      track(EVENTS.guestJoined, { eventId });
      router.push(`/e/${slug}`);
    });

  return (
    <section className="card animate-slide-up p-6">
      <h1 className="text-center font-serif text-3xl text-mauve-deep">
        What should we call you?
      </h1>
      <p className="mt-2 text-center text-sm text-mauve/80">
        This is the name your friends will see on the {who} leaderboard.
      </p>

      <div className="mt-6 space-y-3">
        <label className="eyebrow text-mauve" htmlFor="guest-name">
          Your name
        </label>
        <input
          id="guest-name"
          className="field text-lg"
          maxLength={28}
          autoComplete="name"
          placeholder="e.g. Auntie Priya"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && submit()}
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          className="btn-primary w-full py-3.5 text-base"
        >
          {pending ? "Joining…" : `Start with ${bankroll} coins`}
        </button>
      </div>
    </section>
  );
}
