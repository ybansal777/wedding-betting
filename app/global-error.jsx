"use client";

// Last resort: catches errors thrown by the root layout itself, where the normal
// error boundary can't render because the layout wrapping it failed.
//
// It has to supply its own <html> and <body>, and it cannot rely on the app's
// CSS having loaded — hence the inline styles. Plain, self-contained, always
// renders.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf5e9",
          color: "#6b4e5e",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "1.75rem",
              margin: "0 0 0.75rem",
            }}
          >
            Something went badly wrong
          </h1>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.6, opacity: 0.85 }}>
            Nothing has been lost. Reload and it will almost certainly come back.
          </p>
          {error?.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                opacity: 0.6,
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: "0.85rem 2rem",
              borderRadius: "1rem",
              border: 0,
              background: "linear-gradient(135deg, #d99ca6, #c27c88)",
              color: "#fffdf7",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
