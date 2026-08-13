# 💍 Wedding Bets

A mobile-first prediction game for weddings. Any couple signs up, writes their own
questions, sets their own odds, and shares one link. Guests get play money, bet on
how the day unfolds, and climb a live leaderboard.

Built with **Next.js (App Router)**, **Tailwind**, and **Supabase** (Postgres +
Auth), deployable to **Vercel**.

> **Play money only.** Guests never buy anything and nothing can be cashed out.
> The only payment is a host buying the software.

Requirements live in [`.claude/prds/wedding-bets-saas.prd.md`](.claude/prds/wedding-bets-saas.prd.md).

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

Two options, deliberately. A couple choosing between two *paid* tiers on the way
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
./scripts/test-rls.sh      # 73 assertions, throwaway Docker Postgres
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

There is no migration chain to replay. Future incremental changes go in
`supabase/migrations/`, applied after the base schema.

> The original app — Vite, single-tenant, its own schema — is untouched on the
> `main` branch.

### 2. Configure auth providers

In **Authentication → Providers**, enable **Google** and **Apple**, and add
`https://<your-domain>/auth/callback` to the redirect allow-list.

Phone OTP stays disabled behind `NEXT_PUBLIC_ENABLE_PHONE_AUTH` until you have an
SMS provider *and* US A2P 10DLC registration — that takes weeks, and unregistered
senders get rate-limited into uselessness.

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
| `NEXT_PUBLIC_ENABLE_PHONE_AUTH` | `true` only once SMS actually sends |

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
leaderboard by re-joining every bet on every read — fine for one wedding, ruinous
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
- **Apple and Google sign-in are unconfigured.** The buttons work; the providers
  need enabling in Supabase with a redirect allow-list.
- **Phone OTP is off** behind `NEXT_PUBLIC_ENABLE_PHONE_AUTH` until an SMS
  provider and A2P 10DLC registration are in place.
- **The legal pages need a lawyer.** They describe what the code does honestly,
  which is not the same as being a reviewed privacy policy or contract.
- **No email templating.** Supabase's default OTP and confirmation emails are
  unbranded.
