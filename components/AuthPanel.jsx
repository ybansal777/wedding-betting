"use client";

import { useState } from "react";
import { browserClient } from "../lib/supabase";
import { track, EVENTS } from "../lib/analytics";
import { useToast } from "./Toast";

// Sign-in surface, shared by the host console and the guest join flow.
//
// Ordering here is a product decision, not a layout one. The PRD's biggest
// single risk is that a guest bounces during signup at a reception, so the
// cheapest methods come first: one-tap SSO, then phone, then email. Guests
// never see a password field — nobody invents a password standing at a table.
//
// Phone OTP requires an SMS provider AND US A2P 10DLC registration, which takes
// weeks. Until that clears, the button is hidden by env flag rather than failing
// in front of a guest.
const PHONE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PHONE_AUTH === "true";

export default function AuthPanel({
  mode = "guest",
  redirectTo = "/",
  title,
  subtitle,
  eventId = null,
}) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  // "choose" → picking a method, then a code-entry step
  const [step, setStep] = useState("choose");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const isHost = mode === "host";

  const supabase = browserClient();
  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  // The denominator of the PRD's kill criterion: someone who began signing in.
  // Fired at the moment of intent, not on page view, so the ratio measures
  // drop-off during auth rather than curiosity about the page.
  const started = (method) =>
    track(EVENTS.authStarted, { eventId, props: { method, mode } });

  const oauth = async (provider) => {
    setBusy(true);
    started(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      notify(error.message, { tone: "error" });
      setBusy(false);
    }
    // On success the browser navigates away; leave `busy` set.
  };

  const sendPhoneCode = async () => {
    setBusy(true);
    started("phone");
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) return notify(error.message, { tone: "error" });
    setStep("phone-code");
    notify("Code sent — check your messages.", { tone: "success" });
  };

  const sendEmailCode = async () => {
    setBusy(true);
    started("email");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    if (error) return notify(error.message, { tone: "error" });
    setStep("email-code");
    notify("Code sent — check your email.", { tone: "success" });
  };

  const verify = async (type) => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp(
      type === "sms"
        ? { phone, token: code, type: "sms" }
        : { email, token: code, type: "email" }
    );
    setBusy(false);
    if (error) return notify(error.message, { tone: "error" });
    track(EVENTS.authCompleted, {
      eventId,
      props: { method: type === "sms" ? "phone" : "email", mode },
    });
    window.location.assign(redirectTo);
  };

  const hostPassword = async (kind) => {
    setBusy(true);
    started(kind === "signup" ? "email-signup" : "email-password");
    const { data, error } =
      kind === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: callbackUrl() },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return notify(error.message, { tone: "error" });
    if (kind === "signup" && !data.session) {
      return notify("Check your email to confirm your account.", {
        tone: "success",
      });
    }
    window.location.assign(redirectTo);
  };

  return (
    <section className="card animate-slide-up p-6">
      <h1 className="text-center font-serif text-3xl text-mauve-deep">
        {title || (isHost ? "Host sign in" : "Join the game")}
      </h1>
      {subtitle && (
        <p className="mt-2 text-center text-sm text-mauve/80">{subtitle}</p>
      )}

      {step === "choose" && (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => oauth("apple")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-mauve-deep py-3.5 font-semibold text-cream-card transition active:scale-[0.98] disabled:opacity-50"
          >
            Continue with Apple
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => oauth("google")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-mauve/25 bg-cream-card py-3.5 font-semibold text-mauve-deep transition active:scale-[0.98] disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="scallop-divider py-1">
            <span className="text-xs text-mauve/60">or</span>
          </div>

          {PHONE_ENABLED && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep("phone")}
              className="btn-ghost w-full py-3"
            >
              Use my phone number
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => setStep("email")}
            className="btn-ghost w-full py-3"
          >
            Use my email
          </button>
        </div>
      )}

      {step === "phone" && (
        <div className="mt-6 space-y-3">
          <label className="eyebrow text-mauve" htmlFor="auth-phone">
            Phone number
          </label>
          <input
            id="auth-phone"
            className="field"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 555 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || phone.trim().length < 8}
            onClick={sendPhoneCode}
            className="btn-primary w-full py-3"
          >
            {busy ? "Sending…" : "Send me a code"}
          </button>
          <BackLink onClick={() => setStep("choose")} />
        </div>
      )}

      {step === "email" && (
        <div className="mt-6 space-y-3">
          <label className="eyebrow text-mauve" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {isHost ? (
            <>
              <label className="eyebrow text-mauve" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                className="field"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !email || password.length < 8}
                onClick={() => hostPassword("signin")}
                className="btn-primary w-full py-3"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <button
                type="button"
                disabled={busy || !email || password.length < 8}
                onClick={() => hostPassword("signup")}
                className="btn-ghost w-full py-3"
              >
                Create an account
              </button>
              <p className="text-center text-xs text-mauve/60">
                Passwords need at least 8 characters.
              </p>
              <a
                href="/reset-password"
                className="block text-center text-sm text-mauve underline underline-offset-4 hover:text-mauve-deep"
              >
                Forgotten your password?
              </a>
            </>
          ) : (
            <button
              type="button"
              disabled={busy || !email.includes("@")}
              onClick={sendEmailCode}
              className="btn-primary w-full py-3"
            >
              {busy ? "Sending…" : "Send me a code"}
            </button>
          )}
          <BackLink onClick={() => setStep("choose")} />
        </div>
      )}

      {(step === "phone-code" || step === "email-code") && (
        <div className="mt-6 space-y-3">
          <label className="eyebrow text-mauve" htmlFor="auth-code">
            Enter the 6-digit code
          </label>
          <input
            id="auth-code"
            className="field text-center text-2xl tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button
            type="button"
            disabled={busy || code.length < 6}
            onClick={() => verify(step === "phone-code" ? "sms" : "email")}
            className="btn-primary w-full py-3"
          >
            {busy ? "Checking…" : "Continue"}
          </button>
          <BackLink
            onClick={() => {
              setCode("");
              setStep("choose");
            }}
          />
        </div>
      )}
    </section>
  );
}

function BackLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto block text-sm text-mauve underline underline-offset-4 hover:text-mauve-deep"
    >
      ← Use a different method
    </button>
  );
}
