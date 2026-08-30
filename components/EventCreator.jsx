"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "../lib/actions";
import { EVENT_TYPES, DEFAULT_EVENT_TYPE } from "../lib/eventTypes";
import { useToast } from "./Toast";
import BettingModePicker from "./BettingModePicker";

const BLANK = {
  title: "",
  eventType: DEFAULT_EVENT_TYPE,
  subtitle: "",
  eventDate: "",
  bankroll: 100,
  bettingMode: "",
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
      if (!form.bettingMode) {
        return notify("Pick Betting or Live betting first.", { tone: "error" });
      }
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
        First pick how guests play. You can change the rest later. Nothing is
        public until you publish.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="eyebrow text-mauve">How do guests play?</label>
          <p className="mt-1 text-xs text-mauve/70">
            This decides what kinds of questions you can write.
          </p>
          <div className="mt-2">
            <BettingModePicker
              value={form.bettingMode}
              onChange={(bettingMode) => setForm({ ...form, bettingMode })}
            />
          </div>
        </div>

        <div>
          <label className="eyebrow text-mauve">What kind of event?</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setForm({ ...form, eventType: t.key })}
                className={`rounded-xl border-2 px-3 py-1.5 text-sm font-semibold transition ${
                  form.eventType === t.key
                    ? "border-blush bg-blush/10 text-blush-deep"
                    : "border-mauve/25 text-mauve hover:bg-cream-deep/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="eyebrow text-mauve" htmlFor="ev-title">
            Event name
          </label>
          <input
            id="ev-title"
            className="field mt-1"
            value={form.title}
            onChange={set("title")}
            placeholder="Jordan's 30th Birthday"
          />
        </div>

        <div>
          <label className="eyebrow text-mauve" htmlFor="ev-subtitle">
            Subtitle (optional)
          </label>
          <input
            id="ev-subtitle"
            className="field mt-1"
            value={form.subtitle}
            onChange={set("subtitle")}
            placeholder="30 and thriving"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow text-mauve" htmlFor="ev-date">
              Event date
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
          disabled={pending || !form.title.trim() || !form.bettingMode}
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
