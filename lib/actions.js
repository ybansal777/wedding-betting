"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverClient } from "./supabase";
import { EVENT_TYPE_KEYS, DEFAULT_EVENT_TYPE } from "./eventTypes";
import { resolveQuestionFields } from "./questionDraft";
import {
  BETTING_MODE_KEYS,
  DEFAULT_BETTING_MODE,
} from "./bettingModes";

// Database exceptions come back as raw codes (`guest_limit_reached`). Guests and
// hosts should never see those, and the PRD is explicit that an error has to say
// what went wrong and how to fix it.
const MESSAGES = {
  not_authenticated: "Please sign in first.",
  event_not_found: "We couldn't find that event.",
  event_not_open: "This event hasn't opened yet.",
  event_closed: "This event has closed.",
  event_not_live: "Betting isn't open yet — the host hasn't started the game.",
  not_a_guest: "Join the event before placing a bet.",
  not_authorised: "Only the host can do that.",
  question_not_found: "That question no longer exists.",
  question_settled: "That question has already been settled.",
  option_not_found: "That option is no longer on the board.",
  invalid_wager: "Wagers have to be at least 1.",
  wager_too_high: "That's over the max for this question.",
  insufficient_balance: "That's more than your balance covers.",
  display_name_required: "Pick a name your friends will recognise.",
  guest_limit_reached:
    "This event is full. The host can raise the guest limit by upgrading.",
  question_limit_reached:
    "You've hit the free plan's question limit. Upgrade to add more.",
  tier_lacks_themes: "Themes are a Premium feature.",
  tier_lacks_branding: "Custom colours, your logo and a custom link are Premium.",
  tier_lacks_export: "Exporting results is a Premium feature.",
  slug_bad_length: "Links need to be between 3 and 48 characters.",
  slug_bad_format: "Links can use lowercase letters, numbers and hyphens only.",
  slug_reserved: "That word is reserved. Try something more personal.",
  slug_taken: "Someone already has that link. Try another.",
  rate_limited: "That's a lot of requests — give it a moment and try again.",
};

function friendly(error) {
  if (!error) return null;
  const raw = error.message || "";
  for (const key of Object.keys(MESSAGES)) {
    if (raw.includes(key)) return MESSAGES[key];
  }
  if (error.code === "23505") return "That's already been saved.";
  return raw || "Something went wrong. Please try again.";
}

const ok = (data) => ({ ok: true, data });
const fail = (error) => ({ ok: false, error: friendly(error) });

// PostgREST's "column not found in schema cache" code. Surfaces here on a
// project that hasn't run supabase/migrations/0001_multi_event.sql yet — the
// multi-event columns exist in schema.sql, but not in the live table. Falling
// back to the pre-migration shape means the app stays usable (minus the new
// fields) instead of throwing a raw Postgres error at the host.
const MISSING_COLUMN = "PGRST204";

/** Run `attempt`; if it fails on a missing column, drop `extraKeys` from the
 * payload and retry once. `attempt(payload)` must return a Supabase response
 * ({ data, error }). */
async function withColumnFallback(payload, extraKeys, attempt) {
  const result = await attempt(payload);
  if (!result.error || result.error.code !== MISSING_COLUMN) return result;
  const fallbackPayload = { ...payload };
  extraKeys.forEach((k) => delete fallbackPayload[k]);
  return attempt(fallbackPayload);
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

// ---------------------------------------------------------------- host: events

export async function createEvent(form) {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail({ message: "not_authenticated" });

  const title = String(form.title || "").trim();
  if (!title) return fail({ message: "Give your event a name." });

  const base = slugify(form.slug || title) || "event";
  // Titles can match ("Birthday"). The public link cannot — first host gets
  // /birthday, the next /birthday-2, then /birthday-3. Guests scan a QR, so
  // they never have to type the suffix.
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { data: taken } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${n}`;
  }

  const eventType = EVENT_TYPE_KEYS.includes(form.eventType)
    ? form.eventType
    : DEFAULT_EVENT_TYPE;

  const insertRow = {
    owner_id: user.id,
    title,
    slug,
    event_type: eventType,
    subtitle: String(form.subtitle || "").trim() || null,
    event_date: form.eventDate || null,
    starting_bankroll: Math.max(10, Number(form.bankroll) || 100),
    betting_mode: BETTING_MODE_KEYS.includes(form.bettingMode)
      ? form.bettingMode
      : DEFAULT_BETTING_MODE,
  };

  const { data, error } = await withColumnFallback(
    insertRow,
    ["event_type", "subtitle", "betting_mode"],
    (payload) => supabase.from("events").insert(payload).select().single()
  );

  if (error) return fail(error);
  revalidatePath("/dashboard");
  return ok(data);
}

export async function updateEvent(eventId, patch) {
  const supabase = await serverClient();

  // Entitlement columns are deliberately absent from this allow-list: tier,
  // max_guests and max_questions are written only by the Stripe webhook.
  const allowed = {};
  if ("title" in patch) allowed.title = String(patch.title).trim();
  if ("eventType" in patch) {
    allowed.event_type = EVENT_TYPE_KEYS.includes(patch.eventType)
      ? patch.eventType
      : DEFAULT_EVENT_TYPE;
  }
  if ("subtitle" in patch) allowed.subtitle = patch.subtitle || null;
  if ("eventDate" in patch) allowed.event_date = patch.eventDate || null;
  if ("status" in patch) allowed.status = patch.status;
  if ("published" in patch) allowed.published = Boolean(patch.published);
  if ("theme" in patch) allowed.theme = patch.theme;
  if ("bankroll" in patch) {
    allowed.starting_bankroll = Math.max(10, Number(patch.bankroll) || 100);
  }
  if ("bettingMode" in patch) {
    allowed.betting_mode = BETTING_MODE_KEYS.includes(patch.bettingMode)
      ? patch.bettingMode
      : DEFAULT_BETTING_MODE;
  }

  const { error } = await withColumnFallback(
    allowed,
    ["event_type", "subtitle", "betting_mode"],
    (payload) => supabase.from("events").update(payload).eq("id", eventId)
  );
  if (error) return fail(error);

  revalidatePath(`/dashboard/${eventId}`);
  revalidatePath("/dashboard");
  return ok(null);
}

// ------------------------------------------------------------- host: questions

async function eventIsLiveBetting(supabase, eventId) {
  const { data } = await supabase
    .from("events")
    .select("betting_mode")
    .eq("id", eventId)
    .maybeSingle();
  return data?.betting_mode === "live";
}

export async function addQuestion(eventId, form) {
  const supabase = await serverClient();
  const live = await eventIsLiveBetting(supabase, eventId);
  const fields = resolveQuestionFields(form, { live });
  if (fields.error) return fail({ message: fields.error });

  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await withColumnFallback(
    { event_id: eventId, sort: count ?? 0, ...fields },
    ["bet_type", "line_value", "max_wager"],
    (payload) => supabase.from("questions").insert(payload)
  );
  if (error) return fail(error);

  revalidatePath(`/dashboard/${eventId}`);
  return ok(null);
}

export async function updateQuestion(eventId, questionId, form) {
  const supabase = await serverClient();
  const live = await eventIsLiveBetting(supabase, eventId);
  const fields = resolveQuestionFields(form, { live });
  if (fields.error) return fail({ message: fields.error });

  if (fields.bet_type === "line") {
    const { data: existing, error: existingError } = await supabase
      .from("questions")
      .select("line_value")
      .eq("id", questionId)
      .maybeSingle();

    // A missing `line_value` column means the multi-event migration hasn't
    // run yet, so there's nothing persisted to compare against — skip the
    // guard rather than fail the whole save on an unrelated schema gap.
    if (
      !existingError &&
      existing &&
      Number(existing.line_value) !== fields.line_value
    ) {
      const { count } = await supabase
        .from("bets")
        .select("id", { count: "exact", head: true })
        .eq("question_id", questionId);
      if (count > 0) {
        return fail({
          message:
            "Guests have already bet on this line — clear their bets first if you need to change the number.",
        });
      }
    }
  }

  const { error } = await withColumnFallback(
    fields,
    ["bet_type", "line_value", "max_wager"],
    (payload) => supabase.from("questions").update(payload).eq("id", questionId)
  );
  if (error) return fail(error);

  revalidatePath(`/dashboard/${eventId}`);
  return ok(null);
}

export async function deleteQuestion(eventId, questionId) {
  const supabase = await serverClient();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);
  if (error) return fail(error);
  revalidatePath(`/dashboard/${eventId}`);
  return ok(null);
}

/**
 * Declare (or clear) a winner. Goes through the RPC because a settlement moves
 * every guest's balance and re-settling has to reverse the previous payout —
 * that has to be one transaction, not three client round-trips.
 */
export async function settleQuestion(
  eventId,
  questionId,
  { winner = null, actualValue = null } = {}
) {
  const supabase = await serverClient();
  let { error } = await supabase.rpc("settle_question", {
    p_question_id: questionId,
    p_winner: winner,
    p_actual_value: actualValue,
  });

  // PGRST202: no function with this name+signature. Pre-migration,
  // settle_question() only takes two args — retry that shape for a 'guess'
  // settlement (there's no pre-migration equivalent for a 'line' one, since
  // the old function has no way to compute a winner from an actual value).
  if (error?.code === "PGRST202" && actualValue === null) {
    ({ error } = await supabase.rpc("settle_question", {
      p_question_id: questionId,
      p_winner: winner,
    }));
  }

  if (error) return fail(error);
  revalidatePath(`/dashboard/${eventId}`);
  return ok(null);
}

/**
 * Reorder by swapping the `sort` value with the neighbour in that direction.
 * A swap rather than a re-index so two hosts reordering at once can't scramble
 * the whole list.
 */
export async function moveQuestion(eventId, questionId, direction) {
  const supabase = await serverClient();

  const { data: list, error: listError } = await supabase
    .from("questions")
    .select("id, sort")
    .eq("event_id", eventId)
    .order("sort")
    .order("created_at");
  if (listError) return fail(listError);

  const index = (list ?? []).findIndex((q) => q.id === questionId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return ok(null);

  const a = list[index];
  const b = list[target];

  // `sort` defaults to the question count at insert time, so duplicates are
  // possible; fall back to positions when the two values match.
  const aSort = a.sort === b.sort ? index : a.sort;
  const bSort = a.sort === b.sort ? target : b.sort;

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("questions").update({ sort: bSort }).eq("id", a.id),
    supabase.from("questions").update({ sort: aSort }).eq("id", b.id),
  ]);
  if (e1 || e2) return fail(e1 || e2);

  revalidatePath(`/dashboard/${eventId}`);
  return ok(null);
}

/**
 * Change the public link (premium). Validation, reserved words and uniqueness
 * are all enforced in set_event_slug() — this only translates the failures.
 *
 * Note the side effect worth warning a Host about: any QR code already printed
 * points at the old slug and stops working.
 */
export async function updateSlug(eventId, slug) {
  const supabase = await serverClient();
  const next = slugify(slug);
  if (!next) return fail({ message: "Give your link a name." });

  const { data, error } = await supabase.rpc("set_event_slug", {
    p_event_id: eventId,
    p_slug: next,
  });
  if (error) return fail(error);

  revalidatePath(`/dashboard/${eventId}`);
  revalidatePath("/dashboard");
  return ok({ slug: data });
}

/** Wipe a rehearsal. Refuses on a live event — see reset_event(). */
export async function resetEvent(eventId) {
  const supabase = await serverClient();
  const { error } = await supabase.rpc("reset_event", { p_event_id: eventId });
  if (error) {
    if (error.message?.includes("cannot_reset_live_event")) {
      return fail({
        message: "Close betting first — resetting deletes every bet.",
      });
    }
    return fail(error);
  }
  revalidatePath(`/dashboard/${eventId}`);
  return ok(null);
}

export async function deleteEvent(eventId) {
  const supabase = await serverClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return fail(error);
  revalidatePath("/dashboard");
  return ok(null);
}

// ------------------------------------------------------------------ guest side

export async function joinEvent(slug, displayName) {
  const supabase = await serverClient();
  const { data, error } = await supabase.rpc("join_event", {
    p_slug: slug,
    p_display_name: displayName,
  });
  if (error) return fail(error);
  revalidatePath(`/e/${slug}`);
  return ok(data);
}

/**
 * Place a whole bet slip. The server re-reads the odds from the question row, so
 * a tampered client payload can't invent a better price, and the balance check
 * happens inside the transaction.
 */
export async function placeBets(eventId, slug, slip) {
  const supabase = await serverClient();
  const payload = (slip || [])
    .map((b) => ({
      question_id: b.questionId,
      pick: b.optionId,
      pick_label: b.label,
      wager: Math.floor(Number(b.wager) || 0),
    }))
    .filter((b) => b.question_id && b.pick && b.wager > 0);

  if (payload.length === 0) return fail({ message: "Your slip is empty." });

  const { data, error } = await supabase.rpc("place_bets", {
    p_event_id: eventId,
    p_bets: payload,
  });
  if (error) return fail(error);

  revalidatePath(`/e/${slug}`);
  return ok({ placed: data ?? 0, requested: payload.length });
}

export async function renameGuest(slug, guestId, displayName) {
  const supabase = await serverClient();
  const name = String(displayName || "").trim();
  if (!name) return fail({ message: "display_name_required" });

  const { error } = await supabase
    .from("event_guests")
    .update({ display_name: name.slice(0, 28) })
    .eq("id", guestId);
  if (error) return fail(error);

  revalidatePath(`/e/${slug}`);
  return ok(null);
}

// ------------------------------------------------------------------------ auth

export async function signOut() {
  const supabase = await serverClient();
  await supabase.auth.signOut();
  redirect("/");
}
