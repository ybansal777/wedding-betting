import { useState } from "react";
import { formatMoney } from "../lib/odds";
import { useToast } from "./Toast";

const FIELD_BASE =
  "rounded-xl border border-mauve/25 bg-cream/50 px-3 py-2.5 text-sm text-mauve-deep placeholder:text-mauve/40 focus:outline-none focus:ring-2 focus:ring-blush/40";
const FIELD = `w-full ${FIELD_BASE}`;

const MAX_OPTIONS = 6;

const optionId = () =>
  globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
const newOption = () => ({ id: optionId(), label: "", odds: "+150" });
const makeBlank = () => ({ prompt: "", options: [newOption(), newOption()] });
// Clone a question into an editable draft (fresh option objects).
const toDraft = (q) => ({
  prompt: q.prompt,
  options: (Array.isArray(q.options) ? q.options : []).map((o) => ({ ...o })),
});

// Editable list of answer options (label + odds), with add/remove. A question
// must keep at least two options.
function OptionsEditor({ options, onChange }) {
  const update = (id, key, val) =>
    onChange(options.map((o) => (o.id === id ? { ...o, [key]: val } : o)));
  const add = () =>
    options.length < MAX_OPTIONS && onChange([...options, newOption()]);
  const remove = (id) =>
    options.length > 2 && onChange(options.filter((o) => o.id !== id));

  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={o.id} className="flex items-stretch gap-2">
          <input
            className={`${FIELD_BASE} min-w-0 flex-1`}
            placeholder={`Option ${i + 1}`}
            value={o.label}
            onChange={(e) => update(o.id, "label", e.target.value)}
          />
          <input
            className={`${FIELD_BASE} w-16 shrink-0 px-2 text-center`}
            placeholder="Odds"
            value={o.odds}
            onChange={(e) => update(o.id, "odds", e.target.value)}
          />
          <button
            type="button"
            onClick={() => remove(o.id)}
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
          onClick={add}
          className="text-sm font-semibold text-blush-deep underline underline-offset-4 hover:opacity-80"
        >
          + Add option
        </button>
      )}
    </div>
  );
}

// One manageable question: declare/clear its winner, edit its text, options &
// odds, or delete it (which also removes any bets placed on it).
function QuestionRow({ q, onSetWinner, onUpdateQuestion, onDeleteQuestion }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(q));
  const [busy, setBusy] = useState(false);
  const options = Array.isArray(q.options) ? q.options : [];

  const startEdit = () => {
    setDraft(toDraft(q));
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    const ok = await onUpdateQuestion(q.id, draft);
    setBusy(false);
    if (ok) setEditing(false);
  };

  const remove = async () => {
    setBusy(true);
    await onDeleteQuestion(q.id);
    setBusy(false);
    setConfirmingDelete(false);
  };

  if (editing) {
    return (
      <div className="rounded-2xl bg-cream-deep/40 p-3 space-y-3">
        <input
          className={FIELD}
          placeholder="Question"
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
            className="flex-1 rounded-xl border-2 border-mauve/25 py-2 text-sm font-semibold text-mauve hover:bg-cream-deep/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button onClick={save} disabled={busy} className="btn-primary flex-1 py-2 text-sm">
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
        <div className="flex shrink-0 gap-2 pt-1">
          <button
            onClick={startEdit}
            className="text-xs text-mauve underline underline-offset-2 hover:text-mauve-deep"
          >
            Edit
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
            className="text-xs text-blush-deep underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <div className="mt-3 rounded-xl border-2 border-blush/40 bg-blush/5 p-3 animate-pop-in">
          <p className="text-center text-sm text-mauve-deep">
            Delete this question? Any bets placed on it will be removed too.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={busy}
              className="flex-1 rounded-xl border-2 border-mauve/25 py-2 text-sm font-semibold text-mauve hover:bg-cream-deep/60 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={remove}
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
              onClick={() => onSetWinner(q.id, o.id)}
              className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
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
          onClick={() => onSetWinner(q.id, null)}
          className="mt-2 text-xs text-mauve underline underline-offset-2 hover:text-mauve-deep"
        >
          Clear winner
        </button>
      )}
    </div>
  );
}

// Admin console. Add questions, manage (edit/delete) and settle them, watch the
// full standings, and share the QR.
export default function AdminPanel({
  questions,
  leaderboard,
  onAddQuestion,
  onSetWinner,
  onUpdateQuestion,
  onDeleteQuestion,
  onExit,
  siteUrl,
}) {
  const [form, setForm] = useState(makeBlank);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const ok = await onAddQuestion(form);
    setBusy(false);
    if (ok) setForm(makeBlank());
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h2 className="font-serif text-3xl text-mauve-deep">Admin Console</h2>
        <button
          onClick={onExit}
          className="mt-1 text-sm text-mauve underline underline-offset-4 hover:text-mauve-deep"
        >
          ← Back to the bets
        </button>
      </div>

      {/* Add question */}
      <section className="card p-5">
        <h3 className="font-serif text-xl text-mauve-deep">Add a question</h3>
        <div className="mt-3 space-y-3">
          <input
            className={FIELD}
            placeholder="Question — e.g. Who gives the longer speech?"
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          />
          <OptionsEditor
            options={form.options}
            onChange={(opts) => setForm({ ...form, options: opts })}
          />
          <button
            onClick={submit}
            disabled={busy}
            className="btn-primary w-full py-3"
          >
            {busy ? "Adding…" : "Add question"}
          </button>
        </div>
      </section>

      {/* Manage & settle questions */}
      <section className="card p-5">
        <h3 className="font-serif text-xl text-mauve-deep">Questions</h3>
        <p className="mt-1 text-xs text-mauve/70">
          Tap an option to declare the winner (pays out instantly). Use Edit to
          change wording, options or odds, or Delete to remove a question.
        </p>
        <div className="mt-3 space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-mauve/70">No questions yet.</p>
          )}
          {questions.map((q) => (
            <QuestionRow
              key={q.id}
              q={q}
              onSetWinner={onSetWinner}
              onUpdateQuestion={onUpdateQuestion}
              onDeleteQuestion={onDeleteQuestion}
            />
          ))}
        </div>
      </section>

      {/* Standings */}
      <section className="card p-5">
        <h3 className="font-serif text-xl text-mauve-deep">Standings</h3>
        <div className="mt-3 space-y-1.5">
          {leaderboard.length === 0 && (
            <p className="text-sm text-mauve/70">No bets placed yet.</p>
          )}
          {leaderboard.map((e, i) => (
            <div
              key={e.name}
              className="flex items-center justify-between rounded-xl bg-cream-deep/40 px-3 py-2"
            >
              <span className="font-serif text-mauve-deep">
                {i + 1}. {e.name}
              </span>
              <span className="font-semibold text-mauve-deep">
                {formatMoney(e.balance)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Share QR */}
      <section className="card p-5 text-center">
        <h3 className="font-serif text-xl text-mauve-deep">Share with guests</h3>
        <div className="mt-3 inline-block rounded-2xl bg-cream-card p-3 shadow-inner">
          <img
            className="h-[200px] w-[200px] rounded-lg object-contain"
            width="200"
            height="200"
            alt="QR code linking to the betting app"
            src="/qr-code.png"
          />
        </div>
        <p className="mt-3 break-all rounded-lg bg-cream-deep/60 px-2 py-1.5 font-mono text-xs text-mauve">
          {siteUrl}
        </p>
      </section>
    </div>
  );
}
