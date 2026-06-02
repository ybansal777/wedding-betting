# 💍 Nikesh & Richa · Wedding Bets

A mobile-first "sportsbook" for the wedding weekend. Guests get **100 fake coins**,
predict the chaos (who cries first, who gives the longer speech…), place bets with
real-feeling odds, and climb a live **leaderboard**. Pure bragging rights — no real money.

Built with **React + Vite + Tailwind**, backed by **Supabase** (Postgres + realtime),
and deployable to **Vercel** for **$0**.

---

## How it works

- **Guests** open the link, type their name (saved on their device), pick a side on each
  question, choose how many coins to wager, and **confirm**. Confirmed bets are final.
- The **leaderboard** updates live across every phone as bets land and results come in.
- The **couple** taps "Couple login" at the bottom, enters the admin code, and gets a
  **Control Room** to add questions and declare winners. Declaring a winner instantly
  pays out everyone who bet on it.

---

## 1. Set up the database (Supabase — free)

1. Create a free account at [supabase.com](https://supabase.com) and make a new project.
2. In the dashboard go to **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the
   `questions` and `bets` tables, security policies, realtime, and a sample question.
3. Go to **Settings → API** and copy your **Project URL** and **anon public** key.

## 2. Run it locally

```bash
npm install
cp .env.example .env      # then paste your Supabase URL + anon key into .env
npm run dev               # open the printed http://localhost:5173 (resize narrow / phone)
```

`.env` values:

| Variable                 | What it is                                            |
| ------------------------ | ----------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase Project URL                                  |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key                              |
| `VITE_ADMIN_KEY`         | Code the couple types to open the admin Control Room  |
| `VITE_SITE_URL`          | Public URL for the guest QR code (leave blank locally)|

## 3. Deploy to Vercel ($0)

1. Push this repo to GitHub.
2. At [vercel.com](https://vercel.com), **Add New → Project** and import the repo.
   Vercel auto-detects Vite (build `vite build`, output `dist`) — no config needed beyond
   the included [`vercel.json`](vercel.json).
3. In the project's **Settings → Environment Variables**, add the same four variables.
   Set `VITE_SITE_URL` to your Vercel URL (e.g. `https://niku-got-rich.vercel.app`).
4. **Deploy.** Open the live URL on your phone and share the QR from the admin panel.

> **Cost:** Vercel Hobby and the Supabase free tier are both $0 — plenty for a wedding.

---

## Security note

This is a bragging-rights app with a **fake** currency, so it's intentionally simple:
the admin code is a **soft, client-side gate** and the database policies are permissive
(anyone with the public link can read standings and place bets). Don't store anything
sensitive here, and change `VITE_ADMIN_KEY` from the default before sharing the link.

## Project structure

```
src/
  App.jsx              orchestrator: data loading, realtime, guest/admin routing
  lib/odds.js          odds math, balance + leaderboard helpers
  lib/supabase.js      Supabase client
  components/          Header, BalanceCard, BetCard, Leaderboard, AdminPanel, FloralCorners
supabase/schema.sql    one-time database setup
```

## Customizing

- **Questions & winners:** all managed live from the admin Control Room — no code changes.
- **Starting coins:** `STARTING_BANKROLL` in `src/lib/odds.js`.
- **Look & feel:** palette and fonts in `tailwind.config.js`; floral corners in
  `src/components/FloralCorners.jsx`.
