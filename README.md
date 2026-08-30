# 🎉 Let's Bet

A mobile-first prediction game for any event — weddings, bachelor/ette parties,
birthdays, family reunions, or anything else with a crowd. Any host signs up,
writes their own questions, sets their own odds (or an Over/Under line), and
shares one link. Guests get play money, bet on how the day unfolds, and climb a
live leaderboard.

Built with **Next.js (App Router)**, **Tailwind**, and **Supabase** (Postgres +
Auth), deployable to **Vercel**.

> **Play money only.** Guests never buy anything and nothing can be cashed out.
> The only payment is a host buying the software.

Requirements live in [`.claude/prds/lets-bet-saas.prd.md`](.claude/prds/lets-bet-saas.prd.md).

---

## What's here

| Milestone | State |
| --------- | ----- |
| 1 · Tenancy & host accounts | ✅ Built |
| 2 · Secure play (guest auth, RLS, server-side money) | ✅ Built · 36 assertions |
| 3 · Host console & question templates | ✅ Built |
| 4 · Monetization (Stripe) | ✅ Built — two tiers; needs live keys and a real test purchase |
| 5 · Customization (themes, logo) | ✅ Built — 7 themes, custom colours, logo upload |
| 6 · Day-of hardening | 🟡 Rehearsal mode, health probe, error boundaries, rate limiting, CI; **the load test has not been run** |
| 7 · Launch surface | ✅ Landing, legal, sitemap, robots |
| 8 · Recap & referral | ✅ Built |

Also built: results export, custom links, the retention purge, a metrics
dashboard, and branded auth email templates (`docs/auth-emails.md`).

## Plans

Two options, deliberately. A host choosing between two *paid* tiers on the way
to buying is a decision that costs conversions and buys nothing.

| | Free | Premium · $39 |
| --- | --- | --- |
| Guests | 15 | Unlimited |
| Questions | 5 | Unlimited |
| Themes | Classic only | All seven |
| Custom accent colour | — | ✓ |
| Logo / monogram | — | ✓ |
| Custom link | — | ✓ |
| Recap page | — | ✓ |
| Results export (CSV) | — | ✓ |

Price is still a hypothesis — run the smoke test before locking it.

### Event types & bet types

A host picks one of five event types at setup (`wedding`, `bachelor_bachelorette`,
`birthday`, `family_reunion`, `other`) — it only changes which question templates
are offered, nothing structural.

Every question is one of two bet types:

- **`guess`** — host-authored multiple choice with fixed American odds per option.
- **`line`** — host sets a single numeric baseline (e.g. "12.5 songs before cake
  cutting"); guests bet Over or Under at fixed odds; the host later reports the
  real number and the winner (or a tied `push`, refunded in full) is computed
  automatically. See `settle_question()` in `supabase/schema.sql`.

A `line` question's `options` column is synthesized by the app as exactly
`[{id:"over",...}, {id:"under",...}]`, so betting and payout code paths
(`place_bets()`, the leaderboard, `BetCard.jsx`) never need to know the
difference between the two bet types.

### Themes

`classic` (free) · `blossom` · `boho` · `garden` · `midnight` (dark) ·
`noir` (dark) · `neon` (dark)

Adding one means editing **three places that must agree**:

1. a `[data-preset="key"]` block in `app/globals.css`
2. the `PRESETS` array in `components/ThemePicker.jsx`
3. the allow-list in `set_event_theme()` (currently in `0006_two_tiers.sql`)

A preset accepted by the database with no matching CSS silently renders as the
default, which reads to the Host as a broken button. `02_entitlements.test.sql`
asserts that unknown presets are rejected.

Custom accent colours are stored as `"R G B"` channel triples, not hex, because
that is what `rgb(var(--x) / <alpha-value>)` needs — a hex value would break
every opacity utility in the app. The picker converts; the database validates.

## Tests

```bash
./scripts/test-rls.sh      # 82 assertions, throwaway Docker Postgres
```

CI runs the same suite plus the build on every push (`.github/workflows/ci.yml`).

Tenant isolation is the thing most worth testing here — the PRD calls a
cross-event leak a release blocker. The suite runs as a **non-superuser**,
because Postgres exempts superusers and table owners from RLS, so a suite run as
`postgres` would report success on policies that don't actually work.

It only ever talks to a container it starts itself on `localhost:55432`. There is
no connection string to pass in, so it cannot reach a hosted project.

Capacity measurement, once something is deployed:

```bash
node scripts/loadtest.mjs <leaderboard-url> --guests 200 --seconds 60
```

---

## Setup

### 1. Create a NEW Supabase project

This app is a separate product from the original single-tenant wedding app, and
it wants its own database. **Do not point it at an existing project** — the
schema below assumes an empty one, and the original app's tables have the same
names with entirely different shapes.

Open **SQL Editor → New query**, paste [`supabase/schema.sql`](supabase/schema.sql),
and run it. That single file is the whole database: every table, RLS policy,
function, view and grant, plus the storage bucket for logo uploads.

There is no migration chain to replay for a fresh project. **If you already have
a provisioned project from before the multi-event / bet-type generalization**,
run [`supabase/migrations/0001_multi_event.sql`](supabase/migrations/0001_multi_event.sql)
instead — it patches an existing database (new columns, the updated
`settle_question()`) without dropping anything. Skipping this on an existing
project surfaces as `PGRST204: Could not find the 'event_type' column ... in
the schema cache` the moment the app touches an event.

> The original app — Vite, single-tenant, its own schema — is untouched on the
> `main` branch.

### 2. Configure auth providers

Three sign-in methods, in the order guests see them: **Google**, **phone**, and
**email**.

**Google** — Authentication → Providers → Google. You need a Client ID and
Secret from the Google Cloud Console, and two URLs have to match exactly or the
flow fails at the last redirect:

| Where | What to add |
| --- | --- |
| Google Cloud → Authorised redirect URIs | `https://<project-ref>.supabase.co/auth/v1/callback` |
| Supabase → URL Configuration → Redirect URLs | `http://localhost:3000/auth/callback` and your production equivalent |

The first is Google returning to Supabase; the second is Supabase returning to
this app. Getting one right and not the other is the usual reason sign-in
"almost" works.

**Phone** — Authentication → Providers → Phone, with an SMS provider (Twilio,
MessageBird, Vonage). For US numbers this also needs **A2P 10DLC registration**,
which takes weeks; until it clears, senders are rate-limited into uselessness.
Until a provider is configured the button shows "text messages aren't set up
yet" rather than a raw API error, and guests can still use Google or email.

**Email** — works out of the box, but see `docs/auth-emails.md`: the built-in
mailer is rate-limited and needs replacing with real SMTP before any event.

### 3. Run it

```bash
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev
```

| Variable | Notes |
| -------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Never prefix with `NEXT_PUBLIC_` — that compiles it into the browser bundle |
| `NEXT_PUBLIC_SITE_URL` | Public origin for guest share links |
| `CRON_SECRET` | Guards the retention purge. `openssl rand -base64 32` |
| `ADMIN_EMAILS` | Comma-separated; unlocks `/dashboard/metrics` |

### 4. Deploy

Import to Vercel, add the same variables, and **put the Vercel region and the
Supabase region in the same place** — a mismatch costs 50–100ms on every query.

---

## How it fits together

```
app/
  page.jsx                          marketing landing (server-rendered for SEO)
  login/                            host sign-in
  dashboard/                        host's events
  dashboard/[eventId]/              the control room
  e/[slug]/                         guest play surface
  e/[slug]/join/                    guest auth + display name
  api/events/[eventId]/leaderboard/ edge-cached standings
components/                         UI, mostly ported from the original app
lib/actions.js                      every mutation (server actions)
lib/supabase.js                     browser / server / service-role clients
supabase/schema.sql                 the entire database, run once
supabase/tests/                     48 assertions, mostly tenant isolation
```

### Three decisions worth knowing before you change things

**Money only moves inside database functions.** There is deliberately no INSERT
policy on `bets`. RLS can say "this row is yours"; it cannot say "you can afford
this". `place_bets()` validates the whole slip atomically and reads the odds from
the question row, so a tampered client can't invent a better price.

**Balances are stored, not derived.** `event_guests.balance` is updated
incrementally on every bet and settlement. The original app recomputed the
leaderboard by re-joining every bet on every read — fine for one event, ruinous
across concurrent events.

**The leaderboard is public and cached.** It is byte-identical for all ~150 guests
at an event, so one cached response serves everyone. That is worth roughly a 25×
reduction in origin load. The trade-off is real and deliberate: anyone with an
event id can read guest display names and play-money balances. No emails, phone
numbers, or user ids are exposed.

---

## Not done yet

Everything below is unverified rather than unbuilt — the code exists, but none
of it has met production.

- **No Stripe purchase has ever completed.** The flow is wired and the webhook is
  idempotent by construction, but it has only been exercised against the SQL
  layer. Run a test-mode purchase end to end before trusting it.
- **The load test has never been run.** Every capacity figure in the PRD is still
  an estimate derived from reading the schema. `scripts/loadtest.mjs` exists to
  replace them; point it at a deployment.
- **No live Supabase project has run these migrations.** They apply cleanly to a
  throwaway Postgres 16 container. Storage policies in `0004` are skipped there,
  since the `storage` schema doesn't exist locally — those are the least-tested
  lines in the repo.
- **Google sign-in is unconfigured.** The button works; the provider needs
  enabling in Supabase, with both redirect URLs above set correctly.
- **Phone sign-in has no SMS provider yet.** It's a primary button, so this is
  the gap most likely to be noticed — configure Twilio and start A2P 10DLC
  registration early, since it takes weeks.
- **The legal pages need a lawyer.** They describe what the code does honestly,
  which is not the same as being a reviewed privacy policy or contract.
- **No email templating.** Supabase's default OTP and confirmation emails are
  unbranded.
