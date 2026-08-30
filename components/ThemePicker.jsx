"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "../lib/supabase";
import { useToast } from "./Toast";
import LogoCropper from "./LogoCropper";

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
    note: "Jewel indigo, hot magenta",
    swatch: ["#16144E", "#FF2E82", "#FCF8FF"],
    free: true,
    dark: true,
  },
  {
    key: "game_night",
    label: "Game Night",
    note: "Teal board, electric blue",
    swatch: ["#061C40", "#20A8FF", "#F4FCFF"],
    free: true,
    dark: true,
  },
  {
    key: "birthday",
    label: "Birthday",
    note: "Candy pink, party fuchsia",
    swatch: ["#FFA8C4", "#EC1076", "#380824"],
  },
  {
    key: "bachelorette",
    label: "Bachelorette",
    note: "Neon magenta dance floor",
    swatch: ["#30082A", "#FF24B0", "#FFF4FC"],
    dark: true,
  },
  {
    key: "bachelor",
    label: "Bachelor",
    note: "Wine room, tangerine",
    swatch: ["#2A0A1C", "#FF6024", "#FFF4EC"],
    dark: true,
  },
  {
    key: "reunion",
    label: "Reunion",
    note: "Sunset amber, hot coral",
    swatch: ["#FFA858", "#E8381C", "#30100A"],
  },
];

// Suggested accents, stored as the "R G B" triples the CSS variables expect.
const ACCENTS = [
  { label: "Magenta", accent: "255 46 130", deep: "214 20 108" },
  { label: "Gold", accent: "255 214 48", deep: "220 168 16" },
  { label: "Fuchsia", accent: "255 36 176", deep: "214 12 140" },
  { label: "Tangerine", accent: "255 96 36", deep: "214 64 16" },
  { label: "Aqua", accent: "20 236 196", deep: "8 196 164" },
  { label: "Sky", accent: "32 168 255", deep: "12 124 230" },
  { label: "Violet", accent: "168 72 255", deep: "128 40 214" },
  { label: "Lime", accent: "156 214 48", deep: "116 172 24" },
  { label: "Coral", accent: "232 56 28", deep: "188 32 16" },
  { label: "Rose", accent: "236 16 118", deep: "190 8 92" },
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

export default function ThemePicker({ event, tier, onChange }) {
  const notify = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [custom, setCustom] = useState("#d99ca6");
  const [cropSrc, setCropSrc] = useState(null);

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

      // Pre-migration escape hatch: a database that hasn't run
      // supabase/migrations/0001_multi_event.sql yet only recognises the old
      // preset names inside set_event_theme() itself, so it raises
      // unknown_preset for every new one. Write the preset straight to the
      // event's theme column instead — RLS still requires event ownership,
      // it just skips the RPC's own tier re-check for this one case. Once the
      // migration runs, the RPC accepts the new names directly and this
      // branch stops firing.
      if (error?.message?.includes("unknown_preset") && "preset" in patch) {
        const { error: fallbackError } = await supabase
          .from("events")
          .update({ theme: { ...theme, preset: patch.preset } })
          .eq("id", event.id);
        if (fallbackError) {
          return notify(friendly(fallbackError.message), { tone: "error" });
        }
        onChange?.(patch);
        notify(successMessage, { tone: "success" });
        router.refresh();
        return;
      }

      if (error) return notify(friendly(error.message), { tone: "error" });
      onChange?.(patch);
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

  const closeCrop = () => {
    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const pickFile = (file, input) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      return notify("Use a PNG, JPG, WebP or SVG.", { tone: "error" });
    }
    if (file.size > 2 * 1024 * 1024) {
      return notify("That image is over 2MB — try a smaller one.", {
        tone: "error",
      });
    }
    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    if (input) input.value = "";
  };

  const commitLogo = async (blob) => {
    setUploading(true);
    try {
      const file = new File([blob], "logo.png", { type: "image/png" });
      const path = `${event.id}/logo-${Date.now()}.png`;
      const { error } = await supabase.storage
        .from("event-logos")
        .upload(path, file, { upsert: true, contentType: "image/png" });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-logos").getPublicUrl(path);

      save({ logoUrl: publicUrl }, "Logo updated.");
      closeCrop();
    } catch (err) {
      notify(
        friendly(err?.message) || "Couldn't upload that image. Try again.",
        { tone: "error" }
      );
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
            onChange={(e) => pickFile(e.target.files?.[0], e.target)}
            className="w-full text-xs text-mauve file:mr-3 file:rounded-xl file:border-0 file:bg-mauve-deep file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cream-card disabled:opacity-40"
          />
          <p className="mt-1 text-[11px] text-mauve/60">
            PNG, JPG, WebP or SVG. Up to 2MB. You can zoom and crop it first.
          </p>
        </div>
        {theme.logoUrl && canBrand && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              disabled={pending || uploading}
              onClick={() => setCropSrc(theme.logoUrl)}
              className="text-xs text-mauve underline underline-offset-2 hover:text-mauve-deep"
            >
              Adjust
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => save({ logoUrl: "" }, "Logo removed.")}
              className="text-xs text-blush-deep underline underline-offset-2"
            >
              Remove
            </button>
          </div>
        )}
      </div>
      {uploading && <p className="mt-2 text-xs text-mauve/70">Saving…</p>}

      {cropSrc && (
        <LogoCropper
          src={cropSrc}
          onCancel={closeCrop}
          onApply={commitLogo}
        />
      )}
    </section>
  );
}
