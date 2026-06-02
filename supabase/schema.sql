-- Wedding Betting App — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL → New query).
--
-- ⚠️ If you ran an EARLIER version of this schema (with option_a/option_b columns),
-- drop the old tables first so they can be recreated in the new shape:
--     drop table if exists public.bets, public.questions cascade;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Each question carries a variable list of options as JSON:
--   [{ "id": "<stable id>", "label": "Nikesh", "odds": "+150" }, ...]
-- `winner` holds the id of the winning option (null until the admin settles it).
create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  prompt     text  not null,
  options    jsonb not null default '[]'::jsonb,
  winner     text,                                  -- option id, or null
  sort       int   not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.bets (
  id          uuid primary key default gen_random_uuid(),
  guest_name  text not null,
  question_id uuid not null references public.questions (id) on delete cascade,
  pick        text not null,                         -- chosen option id
  pick_label  text,                                  -- label snapshot at bet time
  wager       int  not null check (wager > 0),
  odds_at_bet text not null,                         -- odds snapshot at bet time
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

insert into public.questions (prompt, options, sort)
select
  'Who will cry first?',
  '[{"id":"opt-nikesh","label":"Nikesh","odds":"+150"},
    {"id":"opt-richa","label":"Richa","odds":"+250"}]'::jsonb,
  0
where not exists (select 1 from public.questions);
