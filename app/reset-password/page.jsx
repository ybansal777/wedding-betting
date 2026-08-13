"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserClient } from "../../lib/supabase";
import { useToast } from "../../components/Toast";

// Two jobs in one page, because that is how the flow actually arrives:
//   1. Signed out → ask for an email and send the reset link.
//   2. Returning from that link, Supabase has already put a recovery session in
//      place, so we detect it and ask for the new password instead.
export default function ResetPasswordPage() {
  const notify = useToast();
  const [supabase] = useState(() => browserClient());
  const [mode, setMode] = useState("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // A recovery link signs the user in with a short-lived session; if one
    // exists when this page loads, they came from the email.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setMode("update");
    });
  }, [supabase]);

  const sendLink = async () => {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return notify(error.message, { tone: "error" });
    // Deliberately the same message whether or not the address exists — telling
    // a stranger which emails have accounts is an information leak.
    notify("If that address has an account, a reset link is on its way.", {
      tone: "success",
    });
  };

  const updatePassword = async () => {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return notify(error.message, { tone: "error" });
    notify("Password updated.", { tone: "success" });
    window.location.assign("/dashboard");
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-5 px-4 py-10">
      <section className="card animate-slide-up p-6">
        <h1 className="text-center font-serif text-3xl text-mauve-deep">
          {mode === "update" ? "Choose a new password" : "Reset your password"}
        </h1>

        {mode === "request" ? (
          <div className="mt-6 space-y-3">
            <label className="eyebrow text-mauve" htmlFor="reset-email">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !email.includes("@")}
              onClick={sendLink}
              className="btn-primary w-full py-3"
            >
              {busy ? "Sending…" : "Email me a reset link"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <label className="eyebrow text-mauve" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || password.length < 8}
              onClick={updatePassword}
              className="btn-primary w-full py-3"
            >
              {busy ? "Saving…" : "Save new password"}
            </button>
            <p className="text-center text-xs text-mauve/60">
              At least 8 characters.
            </p>
          </div>
        )}
      </section>

      <p className="text-center text-sm text-mauve/70">
        <Link href="/login" className="underline underline-offset-4">
          ← Back to sign in
        </Link>
      </p>
    </main>
  );
}
