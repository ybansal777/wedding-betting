# Auth email templates

Supabase's defaults are unbranded and say "Supabase" to your guests. Paste these
into **Authentication → Email Templates** in the dashboard.

Two things matter more than the styling:

1. **Lead with the code, not the link.** A guest at an event is on their phone
   with one hand. `{{ .Token }}` at the top, large, is the whole email.
2. **Say what it's for.** "Someone is asking me to sign in" is a phishing
   feeling; "sign in to play at the event" is not.

Inline CSS only — email clients strip `<style>` blocks and have no CSS variables.

---

## Magic Link / OTP (guest sign-in)

**Subject:** `{{ .Token }} is your code`

```html
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;background:#faf5e9;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;background:#fffdf7;border-radius:20px;padding:32px 28px;text-align:center;border:1px solid rgba(107,78,94,0.1);">
    <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#9b8aa0;font-weight:600;">
      Let's Bet
    </p>
    <h1 style="margin:12px 0 4px;font-family:Georgia,serif;font-size:26px;font-weight:600;color:#6b4e5e;">
      Your sign-in code
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#6b4e5e;opacity:0.8;">
      Enter this to join the game.
    </p>

    <div style="background:#f3ead6;border-radius:14px;padding:18px 12px;margin-bottom:20px;">
      <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;letter-spacing:0.28em;color:#6b4e5e;font-weight:700;">
        {{ .Token }}
      </span>
    </div>

    <p style="margin:0;font-size:12px;color:#9b8aa0;line-height:1.6;">
      The code expires in an hour. If you didn't ask for it, you can ignore this
      email — nothing has been created.
    </p>
  </div>

  <p style="max-width:420px;margin:16px auto 0;text-align:center;font-size:11px;color:#9b8aa0;">
    Play money · real bragging rights
  </p>
</div>
```

---

## Confirm signup (host accounts)

**Subject:** `Confirm your email`

```html
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;background:#faf5e9;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;background:#fffdf7;border-radius:20px;padding:32px 28px;text-align:center;border:1px solid rgba(107,78,94,0.1);">
    <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#9b8aa0;font-weight:600;">
      Let's Bet
    </p>
    <h1 style="margin:12px 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:600;color:#6b4e5e;">
      Confirm your email
    </h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b4e5e;opacity:0.85;">
      One tap and your event is ready to build.
    </p>

    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:linear-gradient(135deg,#d99ca6,#c27c88);color:#fffdf7;text-decoration:none;font-weight:700;font-size:16px;padding:14px 36px;border-radius:16px;">
      Confirm email
    </a>

    <p style="margin:24px 0 0;font-size:12px;color:#9b8aa0;line-height:1.6;">
      If you didn't sign up, ignore this — no account will be created.
    </p>
  </div>
</div>
```

---

## Reset password (hosts)

**Subject:** `Reset your password`

```html
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;background:#faf5e9;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;background:#fffdf7;border-radius:20px;padding:32px 28px;text-align:center;border:1px solid rgba(107,78,94,0.1);">
    <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#9b8aa0;font-weight:600;">
      Let's Bet
    </p>
    <h1 style="margin:12px 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:600;color:#6b4e5e;">
      Reset your password
    </h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b4e5e;opacity:0.85;">
      This link works once, and expires in an hour.
    </p>

    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:linear-gradient(135deg,#d99ca6,#c27c88);color:#fffdf7;text-decoration:none;font-weight:700;font-size:16px;padding:14px 36px;border-radius:16px;">
      Choose a new password
    </a>

    <p style="margin:24px 0 0;font-size:12px;color:#9b8aa0;line-height:1.6;">
      Didn't ask for this? Ignore it — your password stays as it is.
    </p>
  </div>
</div>
```

---

## Before a real event

**Set a custom SMTP sender.** Supabase's built-in email service is rate limited
to a handful of messages per hour and is meant for development. An event where
150 guests all request a code at once hits that wall within seconds, and those
guests simply cannot get in.

Configure **Project Settings → Authentication → SMTP** with Resend, Postmark or
SES before you run an event of any size. This is the single most likely day-of
failure in the whole auth path.
