"use client";

import { useState } from "react";
import { browserClient } from "../lib/supabase";
import { track, EVENTS } from "../lib/analytics";
import { useToast } from "./Toast";

// Sign-in surface, shared by the host console and the guest join flow.
//
// Ordering here is a product decision, not a layout one. The PRD's biggest
// single risk is that a guest bounces during signup at a reception, so the
// cheapest methods come first: Google one-tap, then phone, then email. Guests
// never see a password field — nobody invents a password standing at a table.
//
// Phone is a first-class method rather than a hidden fallback, which means it
// has to actually work: it needs an SMS provider configured in Supabase AND, in
// the US, A2P 10DLC registration. Until that is done Supabase returns a provider
// error, which the map below turns into something a guest can act on instead of
// a raw API string.
const PROVIDER_ERRORS = [
  {
    match: /unsupported phone provider|phone provider|sms provider|not enabled/i,
    message: "Text messages aren't set up yet — use Google or email instead.",
  },
  {
    match: /provider is not enabled|unsupported provider/i,
    message: "That sign-in method isn't switched on yet. Try email instead.",
  },
  {
    match: /invalid phone|phone.*invalid|E\.164/i,
    message: "Add your country code, like +1 555 123 4567.",
  },
  {
    match: /rate limit|too many/i,
    message: "Too many attempts. Wait a minute and try again.",
  },
  {
    match: /expired|invalid token|otp.*invalid/i,
    message: "That code has expired or doesn't match. Request a new one.",
  },
];

const friendlyAuthError = (raw = "") => {
  for (const { match, message } of PROVIDER_ERRORS) {
    if (match.test(raw)) return message;
  }
  return raw || "Something went wrong. Try again.";
};

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
    // Supabase requires E.164. Guests type "(555) 123-4567" — strip the
    // punctuation and assume +1 only when no country code was given, rather
    // than rejecting them for formatting.
    const digits = phone.replace(/[^\d+]/g, "");
    const e164 = digits.startsWith("+")
      ? digits
      : digits.length === 10
        ? `+1${digits}`
        : `+${digits}`;

    setBusy(true);
    started("phone");
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (error) return notify(friendlyAuthError(error.message), { tone: "error" });
    setPhone(e164); // verifyOtp must be given the exact same string
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
    if (error) return notify(friendlyAuthError(error.message), { tone: "error" });
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
    if (error) return notify(friendlyAuthError(error.message), { tone: "error" });
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
    if (error) return notify(friendlyAuthError(error.message), { tone: "error" });
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
          {/* Google first: one tap, no code to wait for, no typing. */}
          <button
            type="button"
            disabled={busy}
            onClick={() => oauth("google")}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-mauve/25 bg-cream-card py-3.5 font-semibold text-mauve-deep transition active:scale-[0.98] disabled:opacity-50"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => setStep("phone")}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-mauve-deep py-3.5 font-semibold text-cream-card transition active:scale-[0.98] disabled:opacity-50"
          >
            <PhoneMark />
            Continue with phone
          </button>

          <div className="scallop-divider py-1">
            <span className="text-xs text-mauve/60">or</span>
          </div>

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
            className="field text-lg"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && phone.trim().length >= 8 && sendPhoneCode()
            }
          />
          <p className="text-xs text-mauve/60">
            US numbers work as-is. Outside the US, start with your country code.
          </p>
          <button
            type="button"
            disabled={busy || phone.replace(/\D/g, "").length < 8}
            onClick={sendPhoneCode}
            className="btn-primary w-full py-3"
          >
            {busy ? "Sending…" : "Text me a code"}
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

// Google's mark, inline. Google's branding guidelines expect the real logo on
// their button, and an external image would be blocked by CSP anyway.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.500-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C3 17.1 2.1 20.4 2.1 24s.9 6.9 2.4 9.9l7.3-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"
      />
    </svg>
  );
}

function PhoneMark() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
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
