"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "../lib/supabase";
import { useToast } from "./Toast";

// Presets mirror the [data-preset] blocks in globals.css — the keys must match
// the list validated in set_event_theme(), or a Host picks a theme, gets no
// error, and sees nothing change.
//
// Swatches are literal hexes so each card previews its own palette regardless
// of which theme the console itself happens to be rendering in.
const PRESETS = [
  {
    key: "classic",
    label: "Classic",
    note: "Cream and blush",
    swatch: ["#FAF5E9", "#D99CA6", "#6B4E5E"],
    free: true,
  },
  {
    key: "blossom",
    label: "Blossom",
    note: "Soft romantic pink",
    swatch: ["#FDF6F7", "#E88298", "#5C3A48"],
  },
  {
    key: "boho",
    label: "Boho",
    note: "Terracotta and sand",
    swatch: ["#F8F2E9", "#C57C58", "#4A382C"],
  },
  {
    key: "garden",
    label: "Garden",
    note: "Olive and sage",
    swatch: ["#F7F6EE", "#B09E6A", "#3A4A38"],
  },
  {
    key: "midnight",
    label: "Midnight",
    note: "Dark mode, cool blue",
    swatch: ["#161821", "#8194D6", "#E2E6F2"],
    dark: true,
  },
  {
    key: "noir",
    label: "Noir",
    note: "Black tie, ink and gold",
    swatch: ["#18171A", "#CAB07C", "#F0EDE6"],
    dark: true,
  },
  {
    key: "neon",
    label: "Neon",
    note: "Late-night dance floor",
    swatch: ["#0A0A10", "#EC48C8", "#22E2D0"],
    dark: true,
  },
];

// Suggested accents, stored as the "R G B" triples the CSS variables expect.
const ACCENTS = [
  { label: "Blush", accent: "217 156 166", deep: "194 124 136" },
  { label: "Rose", accent: "232 130 152", deep: "202 88 116" },
  { label: "Coral", accent: "224 138 118", deep: "196 106 88" },
  { label: "Terracotta", accent: "197 124 88", deep: "163 92 60" },
  { label: "Gold", accent: "201 162 75", deep: "168 132 52" },
  { label: "Sage", accent: "163 177 138", deep: "126 140 102" },
  { label: "Teal", accent: "94 176 168", deep: "62 140 134" },
  { label: "Cornflower", accent: "138 158 214", deep: "108 128 188" },
  { label: "Plum", accent: "168 128 176", deep: "134 96 144" },
  { label: "Magenta", accent: "218 96 176", deep: "184 66 146" },
];

const ERRORS = {
  tier_lacks_themes: "Themes are a Premium feature.",
  tier_lacks_branding: "Custom colours and your logo are Premium features.",
  not_authorised: "Only the host can change this.",
  unknown_preset: "That theme isn't available.",
  bad_logo_url: "That image link isn't valid.",
  bad_accent_format: "That colour isn't in a format we recognise.",
};

const friendly = (msg) => {
  for (const key of Object.keys(ERRORS)) {
    if (msg?.includes(key)) return ERRORS[key];
  }
  return "Couldn't save that. Try again.";
};

// "#8A4FBF" → "138 79 191". The database stores channel triples because that is
// what `rgb(var(--x) / <alpha-value>)` needs; a hex string would break opacity
// utilities everywhere.
function hexToChannels(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

// A darker partner for the accent, used by gradients and hover states.
function darken(channels, amount = 0.82) {
  const [r, g, b] = channels.split(" ").map(Number);
  return [r, g, b].map((c) => Math.round(c * amount)).join(" ");
}

export default function ThemePicker({ event, tier }) {
  const notify = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [custom, setCustom] = useState("#d99ca6");

  const theme = event.theme || {};
  const canTheme = Boolean(tier?.themes);
  const canBrand = Boolean(tier?.branding);
  const [supabase] = useState(() => browserClient());

  const save = (patch, successMessage) =>
    start(async () => {
      const { error } = await supabase.rpc("set_event_theme", {
        p_event_id: event.id,
        p_preset: patch.preset ?? null,
        p_accent: patch.accent ?? null,
        p_accent_deep: patch.accentDeep ?? null,
        p_logo_url: patch.logoUrl ?? null,
      });
      if (error) return notify(friendly(error.message), { tone: "error" });
      notify(successMessage, { tone: "success" });
      router.refresh();
    });

  const applyCustom = () => {
    const channels = hexToChannels(custom);
    if (!channels) return notify("That isn't a valid colour.", { tone: "error" });
    save(
      { accent: channels, accentDeep: darken(channels) },
      "Custom colour applied."
    );
  };

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return notify("That image is over 2MB — try a smaller one.", {
        tone: "error",
      });
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      // Timestamped filename so a replacement busts any CDN cache.
      const path = `${event.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("event-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-logos").getPublicUrl(path);

      save({ logoUrl: publicUrl }, "Logo updated.");
    } catch (err) {
      notify(friendly(err?.message), { tone: "error" });
    } finally {
      setUploading(false);
    }
  };

  const activePreset = theme.preset || "classic";

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl text-mauve-deep">Look and feel</h2>
        {!canTheme && (
          <span className="rounded-full bg-blush/15 px-2.5 py-0.5 text-xs font-semibold text-blush-deep">
            Premium
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-mauve/70">
        {canTheme
          ? "Changes show on the guest page straight away."
          : "Upgrade to unlock every theme, your own colours, and your logo."}
      </p>

      {/* ---------------------------------------------------------- presets */}
      <h3 className="eyebrow mt-4 text-blush-deep">Theme</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PRESETS.map((p) => {
          const active = activePreset === p.key;
          const locked = !p.free && !canTheme;
          return (
            <button
              key={p.key}
              type="button"
              disabled={pending || locked}
              onClick={() => save({ preset: p.key }, `${p.label} applied.`)}
              className={`relative rounded-2xl border-2 p-2.5 text-left transition disabled:opacity-45 ${
                active
                  ? "border-blush bg-blush/10"
                  : "border-mauve/20 hover:border-blush/50"
              }`}
            >
              <span className="flex gap-1">
                {p.swatch.map((c) => (
                  <span
                    key={c}
                    className="h-6 w-6 rounded-full ring-1 ring-black/10"
                    style={{ background: c }}
                  />
                ))}
              </span>
              <span className="mt-2 block text-xs font-bold text-mauve-deep">
                {p.label}
                {active && " ✓"}
              </span>
              <span className="block text-[10px] leading-tight text-mauve/65">
                {locked ? "Premium" : p.note}
              </span>
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------------- accent */}
      <h3 className="eyebrow mt-5 text-blush-deep">Accent colour</h3>
      <p className="mt-1 text-xs text-mauve/65">
        Buttons, highlights and the bet slip pick this up.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ACCENTS.map((a) => {
          const active = theme.accent === a.accent;
          return (
            <button
              key={a.label}
              type="button"
              disabled={pending || !canBrand}
              title={a.label}
              aria-label={a.label}
              onClick={() =>
                save(
                  { accent: a.accent, accentDeep: a.deep },
                  `${a.label} applied.`
                )
              }
              className={`h-9 w-9 rounded-full ring-2 transition disabled:opacity-40 ${
                active
                  ? "ring-mauve-deep"
                  : "ring-transparent hover:ring-mauve/40"
              }`}
              style={{ background: `rgb(${a.accent})` }}
            />
          );
        })}
      </div>

      {/* ---------------------------------------------------- custom colour */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="color"
          aria-label="Pick a custom accent colour"
          disabled={!canBrand || pending}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-mauve/25 bg-transparent disabled:opacity-40"
        />
        <input
          type="text"
          aria-label="Custom accent hex code"
          disabled={!canBrand || pending}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canBrand && applyCustom()}
          placeholder="#d99ca6"
          className="field min-w-0 flex-1 font-mono text-sm"
        />
        <button
          type="button"
          disabled={!canBrand || pending}
          onClick={applyCustom}
          className="btn-ghost shrink-0 px-4 py-2.5 text-sm"
        >
          Apply
        </button>
      </div>

      {/* ------------------------------------------------------------- logo */}
      <h3 className="eyebrow mt-5 text-blush-deep">Your logo or monogram</h3>
      <div className="mt-2 flex items-center gap-3">
        {theme.logoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={theme.logoUrl}
            alt="Current logo"
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-mauve/20"
          />
        )}
        <div className="min-w-0 flex-1">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={!canBrand || uploading || pending}
            onChange={(e) => upload(e.target.files?.[0])}
            className="w-full text-xs text-mauve file:mr-3 file:rounded-xl file:border-0 file:bg-mauve-deep file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cream-card disabled:opacity-40"
          />
          <p className="mt-1 text-[11px] text-mauve/60">
            PNG, JPG, WebP or SVG. Up to 2MB. Shown as a circle.
          </p>
        </div>
        {theme.logoUrl && canBrand && (
          <button
            type="button"
            disabled={pending}
            onClick={() => save({ logoUrl: "" }, "Logo removed.")}
            className="shrink-0 text-xs text-blush-deep underline underline-offset-2"
          >
            Remove
          </button>
        )}
      </div>
      {uploading && <p className="mt-2 text-xs text-mauve/70">Uploading…</p>}
    </section>
  );
}
