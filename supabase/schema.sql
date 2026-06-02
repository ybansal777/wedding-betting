-- Wedding Betting App — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL → New query).
-- Safe to re-run: it uses IF NOT EXISTS / idempotent policy drops.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  prompt     text not null,
  option_a   text not null,
  option_b   text not null,
  odds_a     text not null default '+100',
  odds_b     text not null default '+100',
  winner     text check (winner in ('A', 'B')),   -- null until the admin settles it
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.bets (
  id          uuid primary key default gen_random_uuid(),
  guest_name  text not null,
  question_id uuid not null references public.questions (id) on delete cascade,
  pick        text not null check (pick in ('A', 'B')),
  wager       int  not null check (wager > 0),
  odds_at_bet text not null,                       -- odds snapshot when the bet was confirmed
  created_at  timestamptz not null default now()
);

-- One confirmed bet per guest per question (case-insensitive on name).
create unique index if not exists bets_guest_question_unique
  on public.bets (lower(guest_name), question_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- NOTE: This is a bragging-rights app with a fake currency. The admin screen is
-- a soft, client-side gate (a shared code), so these policies are intentionally
-- permissive: anyone with the public anon key may read everything, place bets,
-- and (via the admin code in the UI) manage questions. Do not store anything
-- sensitive here.
-- ---------------------------------------------------------------------------

alter table public.questions enable row level security;
alter table public.bets      enable row level security;

drop policy if exists "questions read"   on public.questions;
drop policy if exists "questions write"  on public.questions;
drop policy if exists "bets read"        on public.bets;
drop policy if exists "bets insert"      on public.bets;

create policy "questions read"  on public.questions for select using (true);
create policy "questions write" on public.questions for all    using (true) with check (true);

create policy "bets read"   on public.bets for select using (true);
create policy "bets insert" on public.bets for insert with check (true);
-- (No update/delete policy on bets: confirmed bets are final.)

-- ---------------------------------------------------------------------------
-- Realtime — push live leaderboard / settlement updates to every phone.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.questions;
alter publication supabase_realtime add table public.bets;

-- ---------------------------------------------------------------------------
-- Optional starter question (delete or edit from the admin panel).
-- ---------------------------------------------------------------------------

insert into public.questions (prompt, option_a, option_b, odds_a, odds_b, sort)
select 'Who will cry first?', 'Nikesh', 'Richa', '+150', '+250', 0
where not exists (select 1 from public.questions);
