"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIEW = 280;
const OUT = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function coverScale(w, h) {
  return Math.max(VIEW / w, VIEW / h);
}

function clampOffset(x, y, w, h, zoom) {
  const scale = coverScale(w, h) * zoom;
  const dw = w * scale;
  const dh = h * scale;
  return {
    x: Math.min(0, Math.max(VIEW - dw, x)),
    y: Math.min(0, Math.max(VIEW - dh, y)),
  };
}

export default function LogoCropper({ src, onCancel, onApply }) {
  const imgRef = useRef(null);
  const stageRef = useRef(null);
  const drag = useRef(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);

  const scale = natural.w ? coverScale(natural.w, natural.h) * zoom : 1;
  const drawW = natural.w * scale;
  const drawH = natural.h * scale;

  const applyZoom = useCallback(
    (next) => {
      if (!natural.w) return;
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      const old = coverScale(natural.w, natural.h) * zoom;
      const neu = coverScale(natural.w, natural.h) * z;
      const cx = VIEW / 2;
      const cy = VIEW / 2;
      const relX = (cx - offset.x) / (natural.w * old || 1);
      const relY = (cy - offset.y) / (natural.h * old || 1);
      setZoom(z);
      setOffset(
        clampOffset(
          cx - relX * natural.w * neu,
          cy - relY * natural.h * neu,
          natural.w,
          natural.h,
          z
        )
      );
    },
    [natural, offset, zoom]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      applyZoom(zoom + (e.deltaY > 0 ? -0.12 : 0.12));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom, zoom]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    setDragging(true);
  };

  const onPointerMove = (e) => {
    if (!drag.current || !natural.w) return;
    setOffset(
      clampOffset(
        drag.current.ox + (e.clientX - drag.current.x),
        drag.current.oy + (e.clientY - drag.current.y),
        natural.w,
        natural.h,
        zoom
      )
    );
  };

  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };

  const apply = async () => {
    const img = imgRef.current;
    if (!img || !natural.w) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      const k = OUT / VIEW;
      ctx.beginPath();
      ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, offset.x * k, offset.y * k, drawW * k, drawH * k);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("crop_failed"))),
          "image/png"
        );
      });
      await onApply(blob);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(8_0_32/0.72)] p-4">
      <div
        role="dialog"
        aria-labelledby="logo-crop-title"
        className="card w-full max-w-sm p-5 shadow-glow"
      >
        <h2 id="logo-crop-title" className="font-serif text-xl text-mauve-deep">
          Frame your logo
        </h2>
        <p className="mt-1 text-xs text-mauve/70">
          Drag to move. Zoom until it sits how you want in the circle.
        </p>

        <div
          ref={stageRef}
          className="relative mx-auto mt-4 touch-none"
          style={{ width: VIEW, height: VIEW }}
        >
          <div
            className="absolute inset-0 overflow-hidden rounded-full bg-cream-deep ring-2 ring-blush/50"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ cursor: dragging ? "grabbing" : "grab" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              crossOrigin="anonymous"
              onLoad={(e) => {
                const w = e.currentTarget.naturalWidth;
                const h = e.currentTarget.naturalHeight;
                const s = coverScale(w, h);
                setNatural({ w, h });
                setZoom(1);
                setOffset({
                  x: (VIEW - w * s) / 2,
                  y: (VIEW - h * s) / 2,
                });
                setReady(true);
              }}
              onError={() => setFailed(true)}
              className="absolute max-w-none select-none"
              style={{
                width: drawW,
                height: drawH,
                left: offset.x,
                top: offset.y,
                visibility: ready ? "visible" : "hidden",
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={!ready || zoom <= MIN_ZOOM}
            onClick={() => applyZoom(zoom - 0.2)}
            className="btn-ghost h-10 w-10 shrink-0 text-lg disabled:opacity-40"
          >
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.05"
            aria-label="Zoom"
            disabled={!ready}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="w-full"
          />
          <button
            type="button"
            aria-label="Zoom in"
            disabled={!ready || zoom >= MAX_ZOOM}
            onClick={() => applyZoom(zoom + 0.2)}
            className="btn-ghost h-10 w-10 shrink-0 text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>
        <p className="mt-1 text-center font-mono text-xs text-mauve/60">
          {Math.round(zoom * 100)}%
        </p>

        {failed && (
          <p className="mt-3 text-center text-sm text-blush">
            Couldn&apos;t read that image. Try another file.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-ghost flex-1 py-2.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!ready || busy || failed}
            className="btn-primary flex-1 py-2.5 text-sm"
          >
            {busy ? "Saving…" : "Use this crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
