"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UpgradePanel from "./UpgradePanel";
import ThemePicker from "./ThemePicker";
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
  templatesForEventType,
  newOptionId,
  templateToDraft,
} from "../lib/questionTemplates";
import { formatMoney } from "../lib/odds";
import { useToast } from "./Toast";
import BettingModePicker from "./BettingModePicker";
import GuestPreview from "./GuestPreview";
import { isLiveBetting } from "../lib/bettingModes";
import { questionFromDraft, resolveQuestionFields } from "../lib/questionDraft";
import { EVENT_TYPES, DEFAULT_EVENT_TYPE } from "../lib/eventTypes";

function detailsFrom(event) {
  const raw = event.event_date || "";
  const eventDate = String(raw).slice(0, 10);
  return {
    title: event.title || "",
    subtitle: event.subtitle || "",
    eventDate,
    bankroll: event.starting_bankroll ?? 100,
    eventType: event.event_type || DEFAULT_EVENT_TYPE,
  };
}

const MAX_OPTIONS = 6;
const blankOption = () => ({ id: newOptionId(), label: "", odds: "+150" });
const blankDraft = () => ({
  betType: "guess",
  prompt: "",
  options: [blankOption(), blankOption()],
  lineValue: "",
  overOdds: "-110",
  underOdds: "-110",
  maxWager: "",
});

/** Pull a line question's per-side odds back out of its synthesized options. */
function lineOddsFrom(options) {
  const list = Array.isArray(options) ? options : [];
  return {
    overOdds: list.find((o) => o.id === "over")?.odds || "-110",
    underOdds: list.find((o) => o.id === "under")?.odds || "-110",
  };
}

// ------------------------------------------------------------- line editor

function LineEditor({ lineValue, overOdds, underOdds, onChange }) {
  return (
    <div className="space-y-2">
      <div>
        <label className="eyebrow text-mauve">Line</label>
        <input
          type="number"
          step="any"
          className="field mt-1"
          placeholder="e.g. 12.5"
          value={lineValue}
          onChange={(e) => onChange({ lineValue: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="eyebrow text-mauve">Over odds</label>
          <input
            className="field mt-1 text-center"
            value={overOdds}
            onChange={(e) => onChange({ overOdds: e.target.value })}
          />
        </div>
        <div>
          <label className="eyebrow text-mauve">Under odds</label>
          <input
            className="field mt-1 text-center"
            value={underOdds}
            onChange={(e) => onChange({ underOdds: e.target.value })}
          />
        </div>
      </div>
      {lineValue !== "" && !Number.isNaN(Number(lineValue)) && (
        <p className="text-xs text-mauve/70">
          Guests will see{" "}
          <span className="font-semibold text-mauve-deep">
            Over {lineValue} ({overOdds || "-110"})
          </span>{" "}
          /{" "}
          <span className="font-semibold text-mauve-deep">
            Under {lineValue} ({underOdds || "-110"})
          </span>
        </p>
      )}
    </div>
  );
}

function MaxWagerField({ value, onChange }) {
  return (
    <div>
      <label className="eyebrow text-mauve">Max wager on this question</label>
      <input
        type="number"
        min="1"
        className="field mt-1"
        placeholder="No cap"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="mt-1 text-xs text-mauve/65">
        Leave blank to let guests wager up to their remaining coins.
      </p>
    </div>
  );
}

function BetTypeToggle({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[
        { key: "guess", label: "Multiple choice" },
        { key: "line", label: "Over/Under" },
      ].map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition ${
            value === t.key
              ? "border-blush bg-blush/10 text-blush-deep"
              : "border-mauve/25 text-mauve hover:bg-cream-deep/40"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function DaySwitch({ label, hint, on, disabled, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-cream-deep/55 px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-mauve-deep">{label}</p>
        <p className="text-xs text-mauve/70">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-40 ${
          on ? "bg-blush" : "bg-mauve/30"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-foam shadow-soft transition ${
            on ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- options editor

function OptionsEditor({ options, onChange, showOdds = false }) {
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
          {showOdds && (
            <input
              className="field w-16 shrink-0 px-2 text-center"
              placeholder="Odds"
              aria-label={`Odds for option ${i + 1}`}
              value={o.odds}
              onChange={(e) => update(o.id, "odds", e.target.value)}
            />
          )}
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

/** Settlement UI for a 'line' question: host reports the actual number. */
function LineSettle({ q, busy, live, onSettle }) {
  const [value, setValue] = useState(q.actual_value ?? "");
  const num = Number(value);
  const valid = value !== "" && !Number.isNaN(num);
  const preview = valid
    ? num > q.line_value
      ? `Over ${q.line_value} hits`
      : num < q.line_value
        ? `Under ${q.line_value} hits`
        : "Push — every bet on this question is refunded"
    : null;

  if (q.winner) {
    const resultLabel =
      q.winner === "push" ? "Push" : q.winner === "over" ? "Over" : "Under";
    return (
      <div className="mt-2 flex items-center justify-between rounded-xl bg-sage/15 px-3 py-2.5 text-sm">
        <span className="font-semibold text-sage-deep">
          {resultLabel} · actual {q.actual_value}
        </span>
        <button
          onClick={() => onSettle(q.id, null)}
          disabled={busy}
          className="text-xs text-mauve underline underline-offset-2 hover:text-mauve-deep"
        >
          Clear (reverses payouts)
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input
          type="number"
          step="any"
          disabled={busy || !live}
          className="field flex-1"
          placeholder={`Actual value (line: ${q.line_value})`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          onClick={() => onSettle(q.id, num)}
          disabled={busy || !live || !valid}
          className="btn-primary shrink-0 px-4 text-sm"
        >
          Settle
        </button>
      </div>
      {preview && <p className="text-xs text-mauve/70">{preview}</p>}
      {!live && (
        <p className="text-xs text-mauve/60">Start the game to call winners.</p>
      )}
    </div>
  );
}

function QuestionRow({
  event,
  q,
  busy,
  isFirst,
  isLast,
  liveMode,
  onSettle,
  onSettleLine,
  onSave,
  onDelete,
  onMove,
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(() => ({
    betType: q.bet_type || "guess",
    prompt: q.prompt,
    options: (Array.isArray(q.options) ? q.options : []).map((o) => ({ ...o })),
    lineValue: q.line_value ?? "",
    maxWager: q.max_wager ?? "",
    ...lineOddsFrom(q.options),
  }));

  const options = Array.isArray(q.options) ? q.options : [];
  const isLine = q.bet_type === "line";

  if (editing) {
    return (
      <div className="space-y-3 rounded-2xl bg-cream-deep/40 p-3">
        <input
          className="field"
          value={draft.prompt}
          onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
        />
        {draft.betType === "line" ? (
          <LineEditor
            lineValue={draft.lineValue}
            overOdds={draft.overOdds}
            underOdds={draft.underOdds}
            onChange={(patch) => setDraft({ ...draft, ...patch })}
          />
        ) : (
          <OptionsEditor
            options={draft.options}
            onChange={(opts) => setDraft({ ...draft, options: opts })}
            showOdds={liveMode}
          />
        )}
        <MaxWagerField
          value={draft.maxWager}
          onChange={(maxWager) => setDraft({ ...draft, maxWager })}
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
                betType: q.bet_type || "guess",
                prompt: q.prompt,
                options: options.map((o) => ({ ...o })),
                lineValue: q.line_value ?? "",
                maxWager: q.max_wager ?? "",
                ...lineOddsFrom(q.options),
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
              className="flex-1 rounded-xl border-2 border-blush-deep bg-blush-deep py-2 text-sm font-semibold text-foam hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {q.max_wager != null && (
        <p className="mt-1 text-xs font-semibold text-mauve/70">
          Max wager {formatMoney(q.max_wager)}
        </p>
      )}

      {isLine && !liveMode ? (
        <p className="mt-2 text-xs text-mauve/70">
          Over/Under only works in Live betting. Switch modes to settle this
          one.
        </p>
      ) : isLine ? (
        <LineSettle
          q={q}
          busy={busy}
          live={event.status === "live"}
          onSettle={onSettleLine}
        />
      ) : (
        <>
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
                      ? "border-sage bg-sage text-foam"
                      : "border-sage/40 text-sage-deep hover:bg-sage/10"
                  }`}
                >
                  {active ? "✓ " : ""}
                  {o.label}
                  {liveMode && (
                    <span className={active ? "opacity-80" : " text-mauve/60"}>
                      {" "}
                      ({o.odds})
                    </span>
                  )}
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
        </>
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
  const [localEvent, setLocalEvent] = useState(event);
  const [board, setBoard] = useState(questions);
  const [pane, setPane] = useState("edit");
  const [details, setDetails] = useState(() => detailsFrom(event));
  const ev = localEvent;

  useEffect(() => {
    setLocalEvent(event);
    setDetails(detailsFrom(event));
  }, [event]);
  useEffect(() => {
    setBoard(questions);
  }, [questions]);

  // Falls back to the current origin only for local development, where
  // NEXT_PUBLIC_SITE_URL is usually unset.
  const link =
    shareUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/e/${ev.slug}`
      : "");

  const run = (fn, successMessage, tweak) =>
    new Promise((resolve) =>
      start(async () => {
        const res = await fn();
        if (!res.ok) {
          notify(res.error, { tone: "error" });
          return resolve(false);
        }
        tweak?.();
        if (successMessage) notify(successMessage, { tone: "success" });
        router.refresh();
        resolve(true);
      })
    );

  const questionsLeft = ev.max_questions - board.length;
  const atQuestionCap = questionsLeft <= 0;
  const currentTier = tiers.find((t) => t.key === ev.tier);
  const liveMode = isLiveBetting(ev.betting_mode);

  const applyTheme = (patch) =>
    setLocalEvent((e) => ({
      ...e,
      theme: { ...(e.theme || {}), ...patch },
    }));

  return (
    <div className="mt-4">
      <header className="text-center lg:text-left">
        <h1 className="font-serif text-3xl text-mauve-deep">{ev.title}</h1>
        <p className="mt-1 text-sm text-mauve/75">
          {guests.length} of {ev.max_guests} guests · {board.length} of{" "}
          {ev.max_questions} questions
        </p>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setPane("edit")}
          className={
            pane === "edit" ? "btn-primary py-2.5 text-sm" : "btn-ghost py-2.5 text-sm"
          }
        >
          Host controls
        </button>
        <button
          type="button"
          onClick={() => setPane("preview")}
          className={
            pane === "preview"
              ? "btn-primary py-2.5 text-sm"
              : "btn-ghost py-2.5 text-sm"
          }
        >
          Phone preview
        </button>
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,36rem)_minmax(22rem,26rem)] lg:items-start lg:justify-center lg:gap-8">
        <div
          className={`space-y-5 ${pane === "preview" ? "hidden lg:block" : ""}`}
        >

      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Event details</h2>
        <p className="mt-1 text-xs text-mauve/70">
          Name, date and coins. Changes show on the phone preview straight away.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="eyebrow text-mauve">What kind of event?</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setDetails({ ...details, eventType: t.key })}
                  className={`rounded-xl border-2 px-3 py-1.5 text-sm font-semibold transition ${
                    details.eventType === t.key
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
            <label className="eyebrow text-mauve" htmlFor="edit-title">
              Event name
            </label>
            <input
              id="edit-title"
              className="field mt-1"
              value={details.title}
              onChange={(e) => setDetails({ ...details, title: e.target.value })}
            />
          </div>
          <div>
            <label className="eyebrow text-mauve" htmlFor="edit-subtitle">
              Subtitle (optional)
            </label>
            <input
              id="edit-subtitle"
              className="field mt-1"
              value={details.subtitle}
              onChange={(e) =>
                setDetails({ ...details, subtitle: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow text-mauve" htmlFor="edit-date">
                Event date
              </label>
              <input
                id="edit-date"
                type="date"
                className="field mt-1"
                value={details.eventDate}
                onChange={(e) =>
                  setDetails({ ...details, eventDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="eyebrow text-mauve" htmlFor="edit-bank">
                Starting coins
              </label>
              <input
                id="edit-bank"
                type="number"
                min="10"
                className="field mt-1"
                value={details.bankroll}
                onChange={(e) =>
                  setDetails({ ...details, bankroll: e.target.value })
                }
              />
            </div>
          </div>
          {guests.length > 0 && (
            <p className="text-xs text-mauve/60">
              New guests get the new coin amount. People already in keep their
              balance.
            </p>
          )}
          <button
            type="button"
            disabled={pending || !details.title.trim()}
            onClick={() =>
              run(
                () =>
                  updateEvent(ev.id, {
                    title: details.title,
                    subtitle: details.subtitle,
                    eventDate: details.eventDate,
                    bankroll: details.bankroll,
                    eventType: details.eventType,
                  }),
                "Event updated.",
                () =>
                  setLocalEvent((e) => ({
                    ...e,
                    title: details.title.trim(),
                    subtitle: details.subtitle.trim() || null,
                    event_date: details.eventDate || null,
                    starting_bankroll: Math.max(
                      10,
                      Number(details.bankroll) || 100
                    ),
                    event_type: details.eventType,
                  }))
              )
            }
            className="btn-primary w-full py-2.5 text-sm"
          >
            Save details
          </button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">How guests play</h2>
        <p className="mt-1 text-xs text-mauve/70">
          Betting is even-money picks with an optional max wager. Live betting
          is a sportsbook: you set odds, or an Over/Under line.
        </p>
        <div className="mt-3">
          <BettingModePicker
            value={liveMode ? "live" : "casual"}
            onChange={(bettingMode) =>
              run(
                () => updateEvent(ev.id, { bettingMode }),
                bettingMode === "live"
                  ? "Live betting is on."
                  : "Switched to Betting.",
                () => {
                  setLocalEvent((e) => ({ ...e, betting_mode: bettingMode }));
                  if (bettingMode !== "live") {
                    setDraft((d) => ({ ...d, betType: "guess" }));
                  }
                }
              )
            }
          />
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
            {templatesForEventType(ev.event_type).map((cat) => {
              const picks = cat.questions.filter(
                (t) => liveMode || t.betType !== "line"
              );
              if (picks.length === 0) return null;
              return (
              <div key={cat.name}>
                <p className="eyebrow text-blush-deep">{cat.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {picks.map((t) => (
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
              );
            })}
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
            You&apos;ve used all {ev.max_questions} questions on the{" "}
            {ev.tier} tier. Upgrade to add more — your existing questions and
            bets are untouched.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {liveMode && (
              <BetTypeToggle
                value={draft.betType}
                onChange={(betType) => setDraft({ ...draft, betType })}
              />
            )}
            <input
              className="field"
              placeholder="Question — e.g. Who gives the longest speech?"
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            />
            {liveMode && draft.betType === "line" ? (
              <LineEditor
                lineValue={draft.lineValue}
                overOdds={draft.overOdds}
                underOdds={draft.underOdds}
                onChange={(patch) => setDraft({ ...draft, ...patch })}
              />
            ) : (
              <OptionsEditor
                options={draft.options}
                onChange={(opts) => setDraft({ ...draft, options: opts })}
                showOdds={liveMode}
              />
            )}
            <MaxWagerField
              value={draft.maxWager}
              onChange={(maxWager) => setDraft({ ...draft, maxWager })}
            />
            <button
              onClick={async () => {
                const built = questionFromDraft(draft, { live: liveMode });
                if (built.error) {
                  notify(built.error, { tone: "error" });
                  return;
                }
                const ok = await run(
                  () => addQuestion(ev.id, draft),
                  "Question added.",
                  () => setBoard((rows) => [...rows, built])
                );
                if (ok) {
                  setDraft(blankDraft());
                  setPane("preview");
                }
              }}
              disabled={pending}
              className="btn-primary w-full py-3"
            >
              {pending ? "Adding…" : "Add question"}
            </button>
            <p className="text-center text-xs text-mauve/60">
              {questionsLeft} left on the {ev.tier} tier
            </p>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- questions */}
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Questions</h2>
        <p className="mt-1 text-xs text-mauve/70">
          {liveMode
            ? "Multiple choice: tap an option to declare the winner. Over/Under: enter the actual value. Either way it pays out instantly."
            : "Tap an option to declare the winner. Payouts land instantly, and clearing reverses them."}
        </p>
        <div className="mt-3 space-y-4">
          {board.length === 0 && (
            <p className="text-sm text-mauve/70">No questions yet.</p>
          )}
          {board.map((q, i) => (
            <QuestionRow
              key={q.id}
              event={ev}
              q={q}
              busy={pending}
              liveMode={liveMode}
              isFirst={i === 0}
              isLast={i === board.length - 1}
              onSettle={(id, winner) =>
                run(
                  () => settleQuestion(ev.id, id, { winner }),
                  winner ? "Winner called." : "Winner cleared.",
                  () =>
                    setBoard((rows) =>
                      rows.map((row) =>
                        row.id === id ? { ...row, winner } : row
                      )
                    )
                )
              }
              onSettleLine={(id, actualValue) =>
                run(
                  () => settleQuestion(ev.id, id, { actualValue }),
                  "Line settled.",
                  () =>
                    setBoard((rows) =>
                      rows.map((row) => {
                        if (row.id !== id) return row;
                        const hit =
                          actualValue > row.line_value
                            ? "over"
                            : actualValue < row.line_value
                              ? "under"
                              : "push";
                        return {
                          ...row,
                          winner: hit,
                          actual_value: actualValue,
                        };
                      })
                    )
                )
              }
              onSave={(id, d) => {
                const fields = resolveQuestionFields(d, { live: liveMode });
                if (fields.error) {
                  notify(fields.error, { tone: "error" });
                  return Promise.resolve(false);
                }
                return run(
                  () => updateQuestion(ev.id, id, d),
                  "Saved.",
                  () =>
                    setBoard((rows) =>
                      rows.map((row) =>
                        row.id === id ? { ...row, ...fields } : row
                      )
                    )
                );
              }}
              onDelete={(id) =>
                run(
                  () => deleteQuestion(ev.id, id),
                  "Deleted.",
                  () => setBoard((rows) => rows.filter((row) => row.id !== id))
                )
              }
              onMove={(id, dir) =>
                run(
                  () => moveQuestion(ev.id, id, dir),
                  null,
                  () =>
                    setBoard((rows) => {
                      const from = rows.findIndex((row) => row.id === id);
                      const to = dir === "up" ? from - 1 : from + 1;
                      if (from < 0 || to < 0 || to >= rows.length) return rows;
                      const next = [...rows];
                      [next[from], next[to]] = [next[to], next[from]];
                      return next;
                    })
                )
              }
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- theme */}
      <ThemePicker event={ev} tier={currentTier} onChange={applyTheme} />

      {/* ------------------------------------------------------------- share */}
      <section className="card p-5 text-center">
        <h2 className="font-serif text-xl text-mauve-deep">Share with guests</h2>
        {ev.published ? (
          <>
            {qr && (
              <div
                className="mt-3 inline-block rounded-2xl p-3"
                style={{ background: "#fffaf4" }}
              >
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
                href={`/dashboard/${ev.id}/cards`}
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
        event={ev}
        tiers={tiers}
        guestCount={guests.length}
        questionCount={board.length}
      />

      {/* --------------------------------------------------------- rehearsal */}
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Rehearse</h2>
        <p className="mt-1 text-xs text-mauve/70">
          Start the game, place a few bets from your own phone, call a winner,
          and watch a payout land. Then wipe it clean before your guests arrive.
          Your event gets one attempt — practice on it first.
        </p>
        <button
          type="button"
          onClick={() => {
            if (ev.status === "live") {
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
              {ev.starting_bankroll}? Guests stay joined.
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
                  await run(() => resetEvent(ev.id), "Reset — clean slate.");
                  setConfirmReset(false);
                }}
                disabled={pending}
                className="flex-1 rounded-xl border-2 border-blush-deep bg-blush-deep py-2 text-sm font-semibold text-foam disabled:opacity-50"
              >
                {pending ? "Resetting…" : "Reset"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------- run the game */}
      <section className="card border border-blush/50 bg-blush/10 p-5">
        <p className="eyebrow text-blush">You&apos;re set</p>
        <h2 className="mt-1 font-serif text-xl text-mauve-deep">On the day</h2>
        <p className="mt-1 text-xs text-mauve/70">
          Publishing makes the link work. Starting the game opens betting —
          guests can join and look around before that, but not bet.
        </p>
        <div className="mt-4 space-y-2">
          <DaySwitch
            label="Guest link"
            hint={ev.published ? "Live — anyone with the link can join" : "Off"}
            on={ev.published}
            disabled={pending}
            onToggle={() =>
              run(
                () => updateEvent(ev.id, { published: !ev.published }),
                ev.published ? "Link disabled." : "Your link is live.",
                () =>
                  setLocalEvent((e) => ({ ...e, published: !e.published }))
              )
            }
          />
          <DaySwitch
            label="Betting"
            hint={
              !ev.published
                ? "Turn the guest link on first"
                : ev.status === "live"
                  ? "Open — guests can place bets"
                  : "Closed"
            }
            on={ev.status === "live"}
            disabled={pending || !ev.published}
            onToggle={() =>
              run(
                () =>
                  updateEvent(ev.id, {
                    status: ev.status === "live" ? "closed" : "live",
                  }),
                ev.status === "live" ? "Betting closed." : "Betting is open!",
                () =>
                  setLocalEvent((e) => ({
                    ...e,
                    status: e.status === "live" ? "closed" : "live",
                  }))
              )
            }
          />
        </div>
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
                  const res = await deleteEvent(ev.id);
                  if (!res.ok) return notify(res.error, { tone: "error" });
                  router.push("/dashboard");
                })
              }
              disabled={pending}
              className="flex-1 rounded-2xl border-2 border-blush-deep bg-blush-deep py-3 text-sm font-semibold text-foam disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete forever"}
            </button>
          </div>
        )}
      </section>
        </div>

        <aside
          className={`mt-8 h-[calc(100dvh-9rem)] lg:sticky lg:top-4 lg:mt-0 lg:h-[calc(100dvh-2rem)] ${
            pane === "edit" ? "hidden lg:block" : ""
          }`}
        >
          <GuestPreview event={ev} questions={board} guests={guests} />
        </aside>
      </div>
    </div>
  );
}
