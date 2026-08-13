"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverClient } from "./supabase";
import { newOptionId } from "./questionTemplates";

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
  insufficient_balance: "That's more than your balance covers.",
  display_name_required: "Pick a name your friends will recognise.",
  guest_limit_reached:
    "This event is full. The host can raise the guest limit by upgrading.",
  question_limit_reached:
    "You've hit this tier's question limit. Upgrade to add more.",
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

/** Trim, default the odds, keep ids stable, drop blank options. */
function cleanOptions(list = []) {
  return list
    .map((o) => ({
      id: o.id || newOptionId(),
      label: String(o.label || "").trim(),
      odds: String(o.odds || "").trim() || "+100",
    }))
    .filter((o) => o.label);
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

  const base = slugify(form.slug || title) || "wedding";
  // Slugs are globally unique; append a short suffix rather than failing the
  // Host's first action in the product with a collision error.
  let slug = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: taken } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      title,
      slug,
      partner_a: String(form.partnerA || "").trim() || null,
      partner_b: String(form.partnerB || "").trim() || null,
      event_date: form.eventDate || null,
      starting_bankroll: Math.max(10, Number(form.bankroll) || 100),
    })
    .select()
    .single();

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
  if ("partnerA" in patch) allowed.partner_a = patch.partnerA || null;
  if ("partnerB" in patch) allowed.partner_b = patch.partnerB || null;
  if ("eventDate" in patch) allowed.event_date = patch.eventDate || null;
  if ("status" in patch) allowed.status = patch.status;
  if ("published" in patch) allowed.published = Boolean(patch.published);
  if ("theme" in patch) allowed.theme = patch.theme;
  if ("bankroll" in patch) {
    allowed.starting_bankroll = Math.max(10, Number(patch.bankroll) || 100);
  }

  const { error } = await supabase
    .from("events")
    .update(allowed)
    .eq("id", eventId);
  if (error) return fail(error);

  revalidatePath(`/dashboard/${eventId}`);
  revalidatePath("/dashboard");
  return ok(null);
}

// ------------------------------------------------------------- host: questions

export async function addQuestion(eventId, form) {
  const supabase = await serverClient();
  const prompt = String(form.prompt || "").trim();
  const options = cleanOptions(form.options);
  if (!prompt || options.length < 2) {
    return fail({ message: "Add a question and at least two options." });
  }

  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase
    .from("questions")
    .insert({ event_id: eventId, prompt, options, sort: count ?? 0 });
  if (error) return fail(error);

  revalidatePath(`/dashboard/${eventId}`);
  return ok(null);
}

export async function updateQuestion(eventId, questionId, form) {
  const supabase = await serverClient();
  const prompt = String(form.prompt || "").trim();
  const options = cleanOptions(form.options);
  if (!prompt || options.length < 2) {
    return fail({ message: "Add a question and at least two options." });
  }

  const { error } = await supabase
    .from("questions")
    .update({ prompt, options })
    .eq("id", questionId);
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
export async function settleQuestion(eventId, questionId, winner) {
  const supabase = await serverClient();
  const { error } = await supabase.rpc("settle_question", {
    p_question_id: questionId,
    p_winner: winner ?? null,
  });
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
