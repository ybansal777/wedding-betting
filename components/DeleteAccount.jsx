"use client";

import { useState } from "react";
import { useToast } from "./Toast";

// Deletion is irreversible and cascades across other people's events, so it
// asks for the word DELETE rather than a yes/no dialog. That is deliberate
// friction — a mis-tap here destroys a host's event.
export default function DeleteAccount({ eventCount, guestCount }) {
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(
          json.error === "deletion_unavailable"
            ? "Deletion isn't configured on this deployment yet."
            : "Couldn't delete your account. Please email us.",
          { tone: "error" }
        );
        setBusy(false);
        return;
      }
      window.location.assign("/");
    } catch {
      notify("Couldn't reach the server. Try again.", { tone: "error" });
      setBusy(false);
    }
  };

  return (
    <section className="card border border-blush/30 p-5">
      <h2 className="font-serif text-xl text-mauve-deep">Delete everything</h2>
      <p className="mt-2 text-sm leading-relaxed text-mauve/85">
        This permanently removes your sign-in, {eventCount}{" "}
        {eventCount === 1 ? "event you host" : "events you host"} (including all
        their questions, guests and bets), and your player profile at{" "}
        {guestCount} {guestCount === 1 ? "event" : "events"}. It cannot be
        undone and there is no backup to restore from.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 w-full rounded-2xl border-2 border-blush-deep py-3 font-semibold text-blush-deep transition hover:bg-blush/10"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="eyebrow text-mauve" htmlFor="confirm-delete">
            Type DELETE to confirm
          </label>
          <input
            id="confirm-delete"
            className="field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirm("");
              }}
              disabled={busy}
              className="btn-ghost flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={run}
              disabled={busy || confirm !== "DELETE"}
              className="flex-1 rounded-2xl border-2 border-blush-deep bg-blush-deep py-3 font-semibold text-foam transition hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Delete forever"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
