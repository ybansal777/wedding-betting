import { newOptionId } from "./questionTemplates";

/** Trim, default the odds, keep ids stable, drop blank options. */
export function cleanOptions(list = []) {
  return list
    .map((o) => ({
      id: o.id || newOptionId(),
      label: String(o.label || "").trim(),
      odds: String(o.odds || "").trim() || "+100",
    }))
    .filter((o) => o.label);
}

/**
 * A 'line' question's options are never host-authored — they're always exactly
 * these two entries, synthesized from the line value and per-side odds.
 */
export function buildLineOptions({ lineValue, overOdds, underOdds }) {
  return [
    {
      id: "over",
      label: `Over ${lineValue}`,
      odds: String(overOdds || "").trim() || "-110",
    },
    {
      id: "under",
      label: `Under ${lineValue}`,
      odds: String(underOdds || "").trim() || "-110",
    },
  ];
}

function parseMaxWager(rawCap) {
  if (rawCap === "" || rawCap == null) return { maxWager: null };
  if (!Number.isFinite(Number(rawCap))) {
    return { error: "Max wager has to be a number." };
  }
  return { maxWager: Math.max(1, Math.floor(Number(rawCap))) };
}

/** Shared prompt/options resolution for both 'guess' and 'line' questions. */
export function resolveQuestionFields(form, { live = false } = {}) {
  const prompt = String(form.prompt || "").trim();
  if (!prompt) return { error: "Add a question." };

  const cap = parseMaxWager(form.maxWager);
  if (cap.error) return cap;

  if (form.betType === "line") {
    if (!live) {
      return { error: "Over/Under is only available in Live betting." };
    }
    const lineValue = Number(form.lineValue);
    if (!Number.isFinite(lineValue)) {
      return { error: "Set a line value, e.g. 12.5." };
    }
    return {
      prompt,
      bet_type: "line",
      line_value: lineValue,
      max_wager: cap.maxWager,
      options: buildLineOptions({
        lineValue,
        overOdds: form.overOdds,
        underOdds: form.underOdds,
      }),
    };
  }

  const options = cleanOptions(form.options).map((o) =>
    live ? o : { ...o, odds: "+100" }
  );
  if (options.length < 2) {
    return { error: "Add at least two options." };
  }
  return {
    prompt,
    bet_type: "guess",
    line_value: null,
    max_wager: cap.maxWager,
    options,
  };
}

export function questionFromDraft(form, { live = false } = {}) {
  const fields = resolveQuestionFields(form, { live });
  if (fields.error) return fields;
  return {
    id: `local-${newOptionId()}`,
    winner: null,
    actual_value: null,
    settled_at: null,
    ...fields,
  };
}
