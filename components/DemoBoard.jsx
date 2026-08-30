"use client";

import { useState } from "react";

// A tiny, fake sportsbook that lives on the front page. Nothing here is
// persisted — tapping a side is just so a host can feel the product before
// they sign in. Questions are event-agnostic on purpose.

const QUESTIONS = [
  {
    id: "toast",
    prompt: "Who gives the longest toast?",
    options: [
      { id: "best", label: "Best man", odds: "+140" },
      { id: "maid", label: "Maid of honor", odds: "+110" },
      { id: "aunt", label: "Surprise aunt", odds: "-150" },
    ],
  },
  {
    id: "cry",
    prompt: "First to cry?",
    options: [
      { id: "couple", label: "The couple", odds: "-120" },
      { id: "parent", label: "A parent", odds: "+150" },
      { id: "nobody", label: "Nobody", odds: "+320" },
    ],
  },
];

export default function DemoBoard() {
  const [picks, setPicks] = useState({});

  const toggle = (qid, oid) =>
    setPicks((prev) => ({
      ...prev,
      [qid]: prev[qid] === oid ? null : oid,
    }));

  const n = Object.values(picks).filter(Boolean).length;

  return (
    <div className="card overflow-hidden shadow-glow">
      <div className="flex items-center justify-between border-b border-mauve-deep/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="eyebrow text-sage">Live board</span>
        </div>
        <span className="font-mono text-[11px] text-mauve/70">
          {n === 0 ? "tap a side" : `${n} pick${n === 1 ? "" : "s"} in`}
        </span>
      </div>

      <div className="space-y-5 p-5">
        {QUESTIONS.map((q) => (
          <div key={q.id}>
            <h3 className="font-serif text-lg leading-snug text-mauve-deep">
              {q.prompt}
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {q.options.map((o) => {
                const on = picks[q.id] === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(q.id, o.id)}
                    className={`odds-tile px-2 py-3 ${on ? "is-picked" : ""}`}
                  >
                    <span className="block font-serif text-sm leading-tight text-mauve-deep">
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="border-t border-mauve-deep/10 px-5 py-3 text-center text-xs text-mauve/70">
        Play money. The real board is yours in about twenty minutes.
      </p>
    </div>
  );
}
