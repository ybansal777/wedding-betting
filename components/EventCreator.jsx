"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "../lib/actions";
import { useToast } from "./Toast";

const BLANK = {
  title: "Wedding Bets",
  partnerA: "",
  partnerB: "",
  eventDate: "",
  bankroll: 100,
};

export default function EventCreator({ hasEvents }) {
  const notify = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(!hasEvents);
  const [form, setForm] = useState(BLANK);
  const [pending, start] = useTransition();

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = () =>
    start(async () => {
      const res = await createEvent(form);
      if (!res.ok) return notify(res.error, { tone: "error" });
      notify("Event created — now add your questions.", { tone: "success" });
      router.push(`/dashboard/${res.data.id}`);
    });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full py-3.5"
      >
        Create another event
      </button>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="font-serif text-2xl text-mauve-deep">
        {hasEvents ? "New event" : "Set up your event"}
      </h2>
      <p className="mt-1 text-sm text-mauve/80">
        You can change any of this later. Nothing is public until you publish.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="eyebrow text-mauve" htmlFor="ev-title">
            Event name
          </label>
          <input
            id="ev-title"
            className="field mt-1"
            value={form.title}
            onChange={set("title")}
            placeholder="Wedding Bets"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow text-mauve" htmlFor="ev-a">
              Partner one
            </label>
            <input
              id="ev-a"
              className="field mt-1"
              value={form.partnerA}
              onChange={set("partnerA")}
              placeholder="Nikesh"
            />
          </div>
          <div>
            <label className="eyebrow text-mauve" htmlFor="ev-b">
              Partner two
            </label>
            <input
              id="ev-b"
              className="field mt-1"
              value={form.partnerB}
              onChange={set("partnerB")}
              placeholder="Richa"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow text-mauve" htmlFor="ev-date">
              Wedding date
            </label>
            <input
              id="ev-date"
              type="date"
              className="field mt-1"
              value={form.eventDate}
              onChange={set("eventDate")}
            />
          </div>
          <div>
            <label className="eyebrow text-mauve" htmlFor="ev-bank">
              Starting coins
            </label>
            <input
              id="ev-bank"
              type="number"
              min="10"
              className="field mt-1"
              value={form.bankroll}
              onChange={set("bankroll")}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={pending || !form.title.trim()}
          className="btn-primary w-full py-3.5"
        >
          {pending ? "Creating…" : "Create event"}
        </button>
        {hasEvents && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-ghost w-full py-2.5 text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
