import { useState } from "react";
import { formatMoney } from "../lib/odds";
import { useToast } from "./Toast";

const blank = {
  prompt: "",
  option_a: "",
  option_b: "",
  odds_a: "+150",
  odds_b: "+150",
};

const FIELD =
  "w-full rounded-xl border border-mauve/25 bg-cream/50 px-3 py-2.5 text-sm text-mauve-deep placeholder:text-mauve/40 focus:outline-none focus:ring-2 focus:ring-blush/40";

// One manageable question: declare/clear its winner, edit its text & odds, or
// delete it (which also removes any bets placed on it).
function QuestionRow({ q, onSetWinner, onUpdateQuestion, onDeleteQuestion }) {
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState(q);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  const save = async () => {
    if (!draft.prompt.trim() || !draft.option_a.trim() || !draft.option_b.trim()) {
      notify("Fill in the question and both options.", { tone: "error" });
      return;
    }
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
          onChange={set("prompt")}
        />
        <div className="grid grid-cols-2 gap-2">
          <input className={FIELD} placeholder="Option A" value={draft.option_a} onChange={set("option_a")} />
          <input className={FIELD} placeholder="Odds A" value={draft.odds_a} onChange={set("odds_a")} />
          <input className={FIELD} placeholder="Option B" value={draft.option_b} onChange={set("option_b")} />
          <input className={FIELD} placeholder="Odds B" value={draft.odds_b} onChange={set("odds_b")} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setDraft(q);
              setEditing(false);
            }}
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
            onClick={() => setEditing(true)}
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
      <div className="mt-2 flex gap-2">
        {["A", "B"].map((opt) => {
          const label = opt === "A" ? q.option_a : q.option_b;
          const odds = opt === "A" ? q.odds_a : q.odds_b;
          const active = q.winner === opt;
          return (
            <button
              key={opt}
              onClick={() => onSetWinner(q.id, opt)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                active
                  ? "border-sage bg-sage text-cream-card"
                  : "border-sage/40 text-sage-deep hover:bg-sage/10"
              }`}
            >
              {active ? "✓ " : ""}
              {label}{" "}
              <span className={active ? "opacity-80" : "text-mauve/60"}>
                ({odds})
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
  const notify = useToast();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (!form.prompt.trim() || !form.option_a.trim() || !form.option_b.trim()) {
      notify("Fill in the question and both options.", { tone: "error" });
      return;
    }
    setBusy(true);
    const ok = await onAddQuestion(form);
    setBusy(false);
    if (ok) setForm(blank);
  };

  const field = FIELD;

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
            className={field}
            placeholder="Question — e.g. Who gives the longer speech?"
            value={form.prompt}
            onChange={set("prompt")}
          />
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Option A" value={form.option_a} onChange={set("option_a")} />
            <input className={field} placeholder="Odds A" value={form.odds_a} onChange={set("odds_a")} />
            <input className={field} placeholder="Option B" value={form.option_b} onChange={set("option_b")} />
            <input className={field} placeholder="Odds B" value={form.odds_b} onChange={set("odds_b")} />
          </div>
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
          Tap a side to declare the winner (pays out instantly). Use Edit to fix
          wording or odds, or Delete to remove a question.
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
            className="rounded-lg"
            width="200"
            height="200"
            alt="QR code linking to the betting app"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
              siteUrl
            )}`}
          />
        </div>
        <p className="mt-3 break-all rounded-lg bg-cream-deep/60 px-2 py-1.5 font-mono text-xs text-mauve">
          {siteUrl}
        </p>
      </section>
    </div>
  );
}
