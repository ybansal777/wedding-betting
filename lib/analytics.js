"use client";

import { browserClient } from "./supabase";

const KEY = "wb_anon";

// An opaque per-browser id, generated locally and never derived from anything
// about the person. It exists purely to join "scanned the QR" to "placed a bet"
// — without it, activation rate is unmeasurable and the PRD's kill criterion is
// a promise nobody can keep.
export function anonId() {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id =
        globalThis.crypto?.randomUUID?.() ||
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private mode or storage disabled. Analytics is never worth breaking the
    // product over, so we simply don't track this visit.
    return null;
  }
}

/**
 * Fire-and-forget. Never awaited by UI code and never surfaces an error —
 * a guest at a reception must not see a failure because a metric didn't land.
 */
export function track(name, { eventId = null, props = {} } = {}) {
  try {
    const id = anonId();
    if (!id) return;
    browserClient()
      .rpc("track", {
        p_anon_id: id,
        p_name: name,
        p_event_id: eventId,
        p_props: props,
      })
      .then(
        () => {},
        () => {}
      );
  } catch {
    /* never throws */
  }
}

// Names used across the app. Kept in one place so the SQL views and the call
// sites can't drift apart.
export const EVENTS = {
  eventViewed: "event_viewed",
  authStarted: "auth_started",
  authCompleted: "auth_completed",
  guestJoined: "guest_joined",
  firstBet: "first_bet",
  betsPlaced: "bets_placed",
};
