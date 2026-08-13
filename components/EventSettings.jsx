"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSlug } from "../lib/actions";
import { useToast } from "./Toast";

// Custom link + results export. Both Premium, both enforced in the database —
// this component only decides what to show, never what is allowed.
export default function EventSettings({ event, tier, origin }) {
  const notify = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [slug, setSlug] = useState(event.slug);
  const [downloading, setDownloading] = useState(false);

  const canBrand = Boolean(tier?.branding);
  const canExport = Boolean(tier?.export);
  const changed = slug.trim().toLowerCase() !== String(event.slug).toLowerCase();

  const save = () =>
    start(async () => {
      const res = await updateSlug(event.id, slug);
      if (!res.ok) return notify(res.error, { tone: "error" });
      notify("Link updated. Reprint your table cards.", { tone: "success" });
      router.refresh();
    });

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/export`);
      if (res.status === 402) {
        notify("Exporting results is a Premium feature.", { tone: "error" });
        return;
      }
      if (!res.ok) {
        notify("Couldn't build the export. Try again.", { tone: "error" });
        return;
      }
      // Blob + object URL rather than a plain link, so an auth failure surfaces
      // as a toast instead of downloading an HTML error page named .csv.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.slug}-results.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify("Results downloaded.", { tone: "success" });
    } catch {
      notify("Couldn't reach the server.", { tone: "error" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl text-mauve-deep">
          Link &amp; results
        </h2>
        {!canBrand && (
          <span className="rounded-full bg-blush/15 px-2.5 py-0.5 text-xs font-semibold text-blush-deep">
            Premium
          </span>
        )}
      </div>

      {/* -------------------------------------------------------- custom link */}
      <h3 className="eyebrow mt-4 text-blush-deep">Your link</h3>
      <div className="mt-2 flex items-stretch gap-2">
        <span className="flex items-center rounded-xl bg-cream-deep/60 px-2 font-mono text-xs text-mauve/70">
          {(origin || "").replace(/^https?:\/\//, "") || "…"}/e/
        </span>
        <input
          className="field min-w-0 flex-1 font-mono text-sm"
          value={slug}
          disabled={!canBrand || pending}
          maxLength={48}
          onChange={(e) => setSlug(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && changed && canBrand && save()}
          aria-label="Custom event link"
        />
      </div>
      <p className="mt-1 text-[11px] text-mauve/60">
        Lowercase letters, numbers and hyphens.
        {canBrand && " Changing this breaks any QR code you've already printed."}
      </p>
      {canBrand && changed && (
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-primary mt-2 w-full py-2.5 text-sm"
        >
          {pending ? "Saving…" : "Save link"}
        </button>
      )}

      {/* ------------------------------------------------------------ export */}
      <h3 className="eyebrow mt-5 text-blush-deep">Results export</h3>
      <p className="mt-1 text-xs text-mauve/70">
        Every guest, their final balance, and every bet they placed, as a CSV.
      </p>
      <button
        type="button"
        onClick={download}
        disabled={!canExport || downloading}
        className="btn-ghost mt-2 w-full py-2.5 text-sm"
      >
        {downloading
          ? "Preparing…"
          : canExport
            ? "Download results (CSV)"
            : "Download results (Premium)"}
      </button>
    </section>
  );
}
