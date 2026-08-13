"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UpgradePanel from "./UpgradePanel";
import ThemePicker from "./ThemePicker";
import EventSettings from "./EventSettings";
import {
  addQuestion,
  deleteEvent,
  deleteQuestion,
  moveQuestion,
  resetEvent,
  settleQuestion,
  updateEvent,
  updateQuestion,
} from "../lib/actions";
import {
  TEMPLATE_CATEGORIES,
  newOptionId,
  templateToDraft,
} from "../lib/questionTemplates";
import { formatMoney } from "../lib/odds";
import { useToast } from "./Toast";

const MAX_OPTIONS = 6;
const blankOption = () => ({ id: newOptionId(), label: "", odds: "+150" });
const blankDraft = () => ({
  prompt: "",
  options: [blankOption(), blankOption()],
});

// ---------------------------------------------------------------- options editor

function OptionsEditor({ options, onChange }) {
  const update = (id, key, val) =>
    onChange(options.map((o) => (o.id === id ? { ...o, [key]: val } : o)));

  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={o.id} className="flex items-stretch gap-2">
          <input
            className="field min-w-0 flex-1"
            placeholder={`Option ${i + 1}`}
            value={o.label}
            onChange={(e) => update(o.id, "label", e.target.value)}
          />
          <input
            className="field w-16 shrink-0 px-2 text-center"
            placeholder="Odds"
            aria-label={`Odds for option ${i + 1}`}
            value={o.odds}
            onChange={(e) => update(o.id, "odds", e.target.value)}
          />
          <button
            type="button"
            onClick={() =>
              options.length > 2 && onChange(options.filter((x) => x.id !== o.id))
            }
            disabled={options.length <= 2}
            aria-label={`Remove option ${i + 1}`}
            className="flex w-9 shrink-0 items-center justify-center rounded-xl border border-mauve/25 text-xl leading-none text-blush-deep transition hover:bg-blush/10 disabled:opacity-30"
          >
            ×
          </button>
        </div>
      ))}
      {options.length < MAX_OPTIONS && (
        <button
          type="button"
          onClick={() => onChange([...options, blankOption()])}
          className="text-sm font-semibold text-blush-deep underline underline-offset-4 hover:opacity-80"
        >
          + Add option
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ one question

function QuestionRow({
  event,
  q,
  busy,
  isFirst,
  isLast,
  onSettle,
  onSave,
  onDelete,
  onMove,
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(() => ({
    prompt: q.prompt,
    options: (Array.isArray(q.options) ? q.options : []).map((o) => ({ ...o })),
  }));

  const options = Array.isArray(q.options) ? q.options : [];

  if (editing) {
    return (
      <div className="space-y-3 rounded-2xl bg-cream-deep/40 p-3">
        <input
          className="field"
          value={draft.prompt}
          onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
        />
        <OptionsEditor
          options={draft.options}
          onChange={(opts) => setDraft({ ...draft, options: opts })}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(false)}
            disabled={busy}
            className="btn-ghost flex-1 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              const ok = await onSave(q.id, draft);
              if (ok) setEditing(false);
            }}
            disabled={busy}
            className="btn-primary flex-1 py-2 text-sm"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-cream-deep/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-serif text-lg text-mauve-deep">{q.prompt}</p>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <button
            onClick={() => onMove(q.id, "up")}
            disabled={busy || isFirst}
            aria-label="Move question up"
            className="text-mauve/70 transition hover:text-mauve-deep disabled:opacity-25"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(q.id, "down")}
            disabled={busy || isLast}
            aria-label="Move question down"
            className="text-mauve/70 transition hover:text-mauve-deep disabled:opacity-25"
          >
            ↓
          </button>
          <button
            onClick={() => {
              setDraft({
                prompt: q.prompt,
                options: options.map((o) => ({ ...o })),
              });
              setEditing(true);
            }}
            className="text-xs text-mauve underline underline-offset-2 hover:text-mauve-deep"
          >
            Edit
          </button>
          <button
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="text-xs text-blush-deep underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {confirming && (
        <div className="mt-3 animate-pop-in rounded-xl border-2 border-blush/40 bg-blush/5 p-3">
          <p className="text-center text-sm text-mauve-deep">
            Delete this question? Any bets placed on it are removed too.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="btn-ghost flex-1 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await onDelete(q.id);
                setConfirming(false);
              }}
              disabled={busy}
              className="flex-1 rounded-xl border-2 border-blush-deep bg-blush-deep py-2 text-sm font-semibold text-cream-card hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = q.winner === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onSettle(q.id, active ? null : o.id)}
              disabled={busy || event.status !== "live"}
              className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition disabled:opacity-40 ${
                active
                  ? "border-sage bg-sage text-cream-card"
                  : "border-sage/40 text-sage-deep hover:bg-sage/10"
              }`}
            >
              {active ? "✓ " : ""}
              {o.label}{" "}
              <span className={active ? "opacity-80" : "text-mauve/60"}>
                ({o.odds})
              </span>
            </button>
          );
        })}
      </div>

      {q.winner && (
        <button
          onClick={() => onSettle(q.id, null)}
          disabled={busy}
          className="mt-2 text-xs text-mauve underline underline-offset-2 hover:text-mauve-deep"
        >
          Clear winner (reverses the payout)
        </button>
      )}
      {event.status !== "live" && (
        <p className="mt-2 text-xs text-mauve/60">
          Start the game to call winners.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------- console

export default function HostConsole({
  event,
  questions,
  guests,
  tiers = [],
  qr = null,
  shareUrl = "",
}) {
  const notify = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(blankDraft);
  const [showTemplates, setShowTemplates] = useState(questions.length === 0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Falls back to the current origin only for local development, where
  // NEXT_PUBLIC_SITE_URL is usually unset.
  const link =
    shareUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/e/${event.slug}`
      : "");

  const run = (fn, successMessage) =>
    new Promise((resolve) =>
      start(async () => {
        const res = await fn();
        if (!res.ok) {
          notify(res.error, { tone: "error" });
          return resolve(false);
        }
        if (successMessage) notify(successMessage, { tone: "success" });
        router.refresh();
        resolve(true);
      })
    );

  const questionsLeft = event.max_questions - questions.length;
  const atQuestionCap = questionsLeft <= 0;
  const currentTier = tiers.find((t) => t.key === event.tier);

  return (
    <div className="mt-4 space-y-5">
      <header className="text-center">
        <h1 className="font-serif text-3xl text-mauve-deep">{event.title}</h1>
        <p className="mt-1 text-sm text-mauve/75">
          {guests.length} of {event.max_guests} guests · {questions.length} of{" "}
          {event.max_questions} questions
        </p>
      </header>

      {/* ----------------------------------------------------- run the game */}
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">On the day</h2>
        <p className="mt-1 text-xs text-mauve/70">
          Publishing makes the link work. Starting the game opens betting —
          guests can join and look around before that, but not bet.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              run(
                () => updateEvent(event.id, { published: !event.published }),
                event.published ? "Link disabled." : "Your link is live."
              )
            }
            disabled={pending}
            className={
              event.published ? "btn-ghost py-3 text-sm" : "btn-primary py-3 text-sm"
            }
          >
            {event.published ? "Unpublish" : "Publish link"}
          </button>
          <button
            onClick={() =>
              run(
                () =>
                  updateEvent(event.id, {
                    status: event.status === "live" ? "closed" : "live",
                  }),
                event.status === "live" ? "Betting closed." : "Betting is open!"
              )
            }
            disabled={pending || !event.published}
            className={
              event.status === "live"
                ? "btn-ghost py-3 text-sm"
                : "btn-primary py-3 text-sm"
            }
          >
            {event.status === "live" ? "Close betting" : "Start the game"}
          </button>
        </div>
      </section>

      {/* -------------------------------------------------------- templates */}
      {showTemplates && (
        <section className="card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-xl text-mauve-deep">
              Start from a template
            </h2>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-xs text-mauve underline underline-offset-2"
            >
              Hide
            </button>
          </div>
          <p className="mt-1 text-xs text-mauve/70">
            Tap one to load it into the editor below, then change anything you
            like.
          </p>
          <div className="mt-3 space-y-4">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <p className="eyebrow text-blush-deep">{cat.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {cat.questions.map((t) => (
                    <button
                      key={t.prompt}
                      onClick={() => {
                        setDraft(templateToDraft(t));
                        notify("Loaded — edit it below.", { tone: "info" });
                      }}
                      className="rounded-xl border border-mauve/25 px-2.5 py-1.5 text-left text-xs text-mauve-deep transition hover:bg-blush/10"
                    >
                      {t.prompt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ add question */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-xl text-mauve-deep">Add a question</h2>
          {!showTemplates && (
            <button
              onClick={() => setShowTemplates(true)}
              className="text-xs text-blush-deep underline underline-offset-2"
            >
              Browse templates
            </button>
          )}
        </div>

        {atQuestionCap ? (
          <p className="mt-3 rounded-xl bg-cream-deep/60 p-3 text-sm text-mauve-deep">
            You&apos;ve used all {event.max_questions} questions on the{" "}
            {event.tier} tier. Upgrade to add more — your existing questions and
            bets are untouched.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <input
              className="field"
              placeholder="Question — e.g. Who gives the longest speech?"
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            />
            <OptionsEditor
              options={draft.options}
              onChange={(opts) => setDraft({ ...draft, options: opts })}
            />
            <button
              onClick={async () => {
                const ok = await run(
                  () => addQuestion(event.id, draft),
                  "Question added."
                );
                if (ok) setDraft(blankDraft());
              }}
              disabled={pending}
              className="btn-primary w-full py-3"
            >
              {pending ? "Adding…" : "Add question"}
            </button>
            <p className="text-center text-xs text-mauve/60">
              {questionsLeft} left on the {event.tier} tier
            </p>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- questions */}
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Questions</h2>
        <p className="mt-1 text-xs text-mauve/70">
          Tap an option to declare the winner — it pays out instantly. Tapping it
          again, or Clear winner, reverses the payout.
        </p>
        <div className="mt-3 space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-mauve/70">No questions yet.</p>
          )}
          {questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              event={event}
              q={q}
              busy={pending}
              isFirst={i === 0}
              isLast={i === questions.length - 1}
              onSettle={(id, winner) =>
                run(() => settleQuestion(event.id, id, winner))
              }
              onSave={(id, d) =>
                run(() => updateQuestion(event.id, id, d), "Saved.")
              }
              onDelete={(id) =>
                run(() => deleteQuestion(event.id, id), "Deleted.")
              }
              onMove={(id, dir) => run(() => moveQuestion(event.id, id, dir))}
            />
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- standings */}
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Standings</h2>
        <div className="mt-3 space-y-1.5">
          {guests.length === 0 && (
            <p className="text-sm text-mauve/70">Nobody has joined yet.</p>
          )}
          {guests.map((g, i) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-xl bg-cream-deep/40 px-3 py-2"
            >
              <span className="min-w-0 truncate font-serif text-mauve-deep">
                {i + 1}. {g.display_name}
              </span>
              <span className="shrink-0 font-semibold text-mauve-deep">
                {formatMoney(g.balance)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- theme */}
      <ThemePicker event={event} tier={currentTier} />

      {/* ------------------------------------------------- link and results */}
      <EventSettings
        event={event}
        tier={currentTier}
        origin={link.replace(/\/e\/.*$/, "")}
      />

      {/* ------------------------------------------------------------- share */}
      <section className="card p-5 text-center">
        <h2 className="font-serif text-xl text-mauve-deep">Share with guests</h2>
        {event.published ? (
          <>
            {qr && (
              <div className="mt-3 inline-block rounded-2xl bg-cream-card p-3 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt={`QR code linking to ${link}`}
                  width={200}
                  height={200}
                  className="h-[200px] w-[200px] rounded-lg"
                />
              </div>
            )}
            <p className="mt-3 break-all rounded-lg bg-cream-deep/60 px-2 py-1.5 font-mono text-xs text-mauve">
              {link}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    notify("Link copied.", { tone: "success" });
                  } catch {
                    notify("Couldn't copy — select the link above instead.", {
                      tone: "error",
                    });
                  }
                }}
                className="btn-ghost flex-1 py-2.5 text-sm"
              >
                Copy link
              </button>
              <Link
                href={`/dashboard/${event.id}/cards`}
                className="btn-primary flex-1 py-2.5 text-center text-sm"
              >
                Print table cards
              </Link>
            </div>
            {!shareUrl && (
              <p className="mt-2 text-xs text-mauve/60">
                Set NEXT_PUBLIC_SITE_URL to generate a scannable QR code.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-mauve/80">
            Publish the event to get your shareable link and QR code.
          </p>
        )}
      </section>

      {/* ----------------------------------------------------------- upgrade */}
      <UpgradePanel
        event={event}
        tiers={tiers}
        guestCount={guests.length}
        questionCount={questions.length}
      />

      {/* --------------------------------------------------------- rehearsal */}
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Rehearse</h2>
        <p className="mt-1 text-xs text-mauve/70">
          Start the game, place a few bets from your own phone, call a winner,
          and watch a payout land. Then wipe it clean before your guests arrive.
          A wedding gets one attempt — practise on it first.
        </p>
        <button
          type="button"
          onClick={() => {
            if (event.status === "live") {
              notify("Close betting first — resetting deletes every bet.", {
                tone: "error",
              });
              return;
            }
            setConfirmReset(true);
          }}
          disabled={pending}
          className="btn-ghost mt-3 w-full py-3 text-sm"
        >
          Clear all bets and start fresh
        </button>

        {confirmReset && (
          <div className="mt-3 animate-pop-in rounded-xl border-2 border-blush/40 bg-blush/5 p-3">
            <p className="text-center text-sm text-mauve-deep">
              Delete every bet and reset all {guests.length} balances to{" "}
              {event.starting_bankroll}? Guests stay joined.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                disabled={pending}
                className="btn-ghost flex-1 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await run(() => resetEvent(event.id), "Reset — clean slate.");
                  setConfirmReset(false);
                }}
                disabled={pending}
                className="flex-1 rounded-xl border-2 border-blush-deep bg-blush-deep py-2 text-sm font-semibold text-cream-card disabled:opacity-50"
              >
                {pending ? "Resetting…" : "Reset"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------ danger zone */}
      <section className="card border border-blush/30 p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Delete this event</h2>
        <p className="mt-1 text-xs text-mauve/70">
          Removes the event, its questions, its guests and every bet. Permanent.
        </p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
            className="mt-3 w-full rounded-2xl border-2 border-blush-deep py-3 text-sm font-semibold text-blush-deep transition hover:bg-blush/10"
          >
            Delete event
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
              className="btn-ghost flex-1 py-3 text-sm"
            >
              Keep it
            </button>
            <button
              onClick={() =>
                start(async () => {
                  const res = await deleteEvent(event.id);
                  if (!res.ok) return notify(res.error, { tone: "error" });
                  router.push("/dashboard");
                })
              }
              disabled={pending}
              className="flex-1 rounded-2xl border-2 border-blush-deep bg-blush-deep py-3 text-sm font-semibold text-cream-card disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete forever"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
