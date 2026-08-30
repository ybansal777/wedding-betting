import { BETTING_MODES } from "../lib/bettingModes";

export default function BettingModePicker({ value, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {BETTING_MODES.map((m) => {
        const on = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              on
                ? "border-blush bg-blush/10 shadow-soft"
                : "border-mauve/25 hover:border-blush/40"
            }`}
          >
            <span className="eyebrow text-blush">{m.kicker}</span>
            <span className="mt-1 block font-serif text-xl text-mauve-deep">
              {m.label}
            </span>
            <span className="mt-2 block text-sm leading-relaxed text-mauve/80">
              {m.blurb}
            </span>
          </button>
        );
      })}
    </div>
  );
}
