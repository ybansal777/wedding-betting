-- =============================================================================
-- Wedding Bets — complete schema for a FRESH Supabase project.
--
-- Run this once, in a NEW project's SQL editor. It is the whole database: no
-- migration chain to replay, nothing that touches or depends on an existing
-- deployment.
--
-- Three decisions run through everything below, and they're the ones to
-- understand before changing anything:
--
--   1. TENANCY IS ENFORCED IN THE DATABASE. Every row hangs off an event, and
--      RLS decides who sees it. Application code is not the security boundary.
--
--   2. MONEY MOVES ONLY INSIDE FUNCTIONS. There is deliberately no INSERT
--      policy on `bets`. RLS can express "this row is yours"; it cannot express
--      "you can afford this". place_bets() checks the balance inside the
--      transaction and reads odds from the question, never from the client.
--
--   3. BALANCES ARE STORED, NOT DERIVED. event_guests.balance is maintained
--      incrementally. Recomputing a leaderboard by re-joining every bet on every
--      poll is fine for one wedding and ruinous across concurrent events.
--
-- Verify with ./scripts/test-rls.sh — 48 assertions, throwaway container.
-- =============================================================================

create extension if not exists citext;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Hosts. Mirrors auth.users so we can join without touching the auth schema.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz not null default now()
);

-- What each plan buys. In the database so the Stripe webhook and the UI cannot
-- drift apart. Two tiers on purpose: choosing between two PAID options on the
-- way to buying is a decision that costs conversions and buys nothing.
create table if not exists public.tiers (
  key           text primary key check (key in ('free', 'premium')),
  label         text not null,
  price_cents   int  not null,
  max_guests    int  not null,
  max_questions int  not null,
  themes        boolean not null default false,
  branding      boolean not null default false,
  recap         boolean not null default false,
  export        boolean not null default false
);

insert into public.tiers
  (key, label, price_cents, max_guests, max_questions, themes, branding, recap, export)
values
  ('free',    'Free',       0,     15,     5, false, false, false, false),
  ('premium', 'Premium', 3900, 100000, 10000, true,  true,  true,  true)
on conflict (key) do update set
  label         = excluded.label,
  price_cents   = excluded.price_cents,
  max_guests    = excluded.max_guests,
  max_questions = excluded.max_questions,
  themes        = excluded.themes,
  branding      = excluded.branding,
  recap         = excluded.recap,
  export        = excluded.export;

create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  slug              citext not null unique,
  title             text not null,
  partner_a         text,
  partner_b         text,
  event_date        date,
  starting_bankroll int  not null default 100
                      check (starting_bankroll between 10 and 1000000),
  -- Entitlements. Written only by a completed payment — see guard_entitlements.
  tier              text not null default 'free'
                      check (tier in ('free', 'premium')),
  max_guests        int  not null default 15,
  max_questions     int  not null default 5,
  -- { preset, accent, accentDeep, logoUrl }
  theme             jsonb not null default '{}'::jsonb,
  status            text not null default 'draft'
                      check (status in ('draft', 'live', 'closed')),
  published         boolean not null default false,
  stripe_session_id text,
  created_at        timestamptz not null default now()
);

create index if not exists events_owner_idx on public.events (owner_id, created_at desc);

create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  prompt     text not null,
  -- [{ id, label, odds }] — American odds, host-authored, fixed at bet time.
  options    jsonb not null default '[]'::jsonb,
  winner     text,                      -- option id, null until settled
  settled_at timestamptz,
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists questions_event_idx on public.questions (event_id, sort, created_at);

-- One row per guest per event. `balance` is the figure the leaderboard reads;
-- it is never derived at read time.
create table if not exists public.event_guests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 28),
  balance      int  not null,
  staked       int  not null default 0,
  bets_count   int  not null default 0,
  created_at   timestamptz not null default now(),
  unique (event_id, user_id)
);

-- The leaderboard's only access path: a covering index in rank order.
create index if not exists event_guests_rank_idx
  on public.event_guests (event_id, balance desc, display_name);

create table if not exists public.bets (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  guest_id    uuid not null references public.event_guests (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  pick        text not null,
  pick_label  text,
  wager       int  not null check (wager > 0),
  odds_at_bet text not null,
  payout      int,                      -- null until settled, 0 on a loss
  settled_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (guest_id, question_id)        -- one bet per guest per question
);

create index if not exists bets_question_idx on public.bets (question_id);
create index if not exists bets_guest_idx    on public.bets (guest_id);

-- Audit trail: one row per completed Stripe Checkout session, so a disputed
-- charge can be traced to an event without asking Stripe.
create table if not exists public.purchases (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references public.events (id) on delete cascade,
  owner_id              uuid not null references public.profiles (id) on delete cascade,
  tier                  text not null references public.tiers (key),
  amount_cents          int  not null,
  currency              text not null default 'usd',
  stripe_session_id     text unique,
  stripe_payment_intent text,
  created_at            timestamptz not null default now()
);

create index if not exists purchases_event_idx on public.purchases (event_id);

-- Funnel instrumentation. First-party and minimal — no third-party pixel on a
-- page wedding guests load, and no personal data beyond an opaque browser id.
-- Without this the PRD's kill criterion is a promise nobody can measure.
create table if not exists public.analytics_events (
  id         bigserial primary key,
  event_id   uuid references public.events (id) on delete cascade,
  anon_id    text not null,
  name       text not null check (length(name) between 1 and 60),
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_event_idx
  on public.analytics_events (event_id, name, created_at desc);
create index if not exists analytics_anon_idx
  on public.analytics_events (anon_id, name);

-- =============================================================================
-- HELPERS
-- =============================================================================

-- Odds math — mirrors lib/odds.js exactly.
-- Plain SQL rather than plpgsql: this is called per settled row, and plpgsql
-- call overhead adds up fast on a leaderboard read.
create or replace function public.odds_multiplier(odds text)
  returns numeric
  language sql
  immutable
  parallel safe
as $$
  select case
    when odds is null or odds !~ '^[+-]?[0-9]+$' then 1
    when odds::int = 0                           then 1
    when odds::int > 0  then 1 + odds::int / 100.0
    else                     1 + 100.0 / abs(odds::int)
  end;
$$;

-- Used inside RLS policies, so SECURITY DEFINER to avoid recursive evaluation.
create or replace function public.is_event_owner(p_event_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.events
    where id = p_event_id and owner_id = auth.uid()
  );
$$;

create or replace function public.is_event_guest(p_event_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.event_guests
    where event_id = p_event_id and user_id = auth.uid()
  );
$$;

-- Mirror new auth users into profiles.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tier limit on questions. Blocks ADDING a question only — never a bet, because
-- a paywall must never fire mid-reception.
create or replace function public.enforce_question_limit()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  cap  int;
  used int;
begin
  select max_questions into cap from public.events where id = new.event_id;
  select count(*) into used from public.questions where event_id = new.event_id;
  if used >= cap then
    raise exception 'question_limit_reached'
      using hint = 'Upgrade to Premium to add more questions.';
  end if;
  return new;
end;
$$;

drop trigger if exists questions_limit on public.questions;
create trigger questions_limit
  before insert on public.questions
  for each row execute function public.enforce_question_limit();

-- Entitlement lock.
--
-- SECURITY INVOKER on purpose. A SECURITY DEFINER trigger rewrites current_user
-- to the function's owner, so the role check would always see `postgres` and
-- wave every client update through — exactly the hole this closes. It needs no
-- elevated rights: it only compares OLD to NEW.
create or replace function public.guard_entitlements()
  returns trigger
  language plpgsql
  set search_path = public
as $$
begin
  -- apply_purchase() is SECURITY DEFINER owned by postgres, so legitimate
  -- webhook writes arrive here as the owner and pass.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if new.tier                 is distinct from old.tier
     or new.max_guests        is distinct from old.max_guests
     or new.max_questions     is distinct from old.max_questions
     or new.stripe_session_id is distinct from old.stripe_session_id then
    raise exception 'entitlements_are_read_only'
      using hint = 'Tier changes come from a completed payment, not the client.';
  end if;

  return new;
end;
$$;

drop trigger if exists events_guard_entitlements on public.events;
create trigger events_guard_entitlements
  before update on public.events
  for each row execute function public.guard_entitlements();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles         enable row level security;
alter table public.tiers            enable row level security;
alter table public.events           enable row level security;
alter table public.questions        enable row level security;
alter table public.event_guests     enable row level security;
alter table public.bets             enable row level security;
alter table public.purchases        enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists tiers_read on public.tiers;
create policy tiers_read on public.tiers for select using (true);

-- The host sees their own; everyone sees published ones, because a guest has to
-- load the event before they are a guest of it.
drop policy if exists events_select on public.events;
drop policy if exists events_insert on public.events;
drop policy if exists events_update on public.events;
drop policy if exists events_delete on public.events;
create policy events_select on public.events
  for select using (owner_id = auth.uid() or published = true);
create policy events_insert on public.events
  for insert with check (owner_id = auth.uid());
create policy events_update on public.events
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy events_delete on public.events
  for delete using (owner_id = auth.uid());

drop policy if exists questions_select on public.questions;
drop policy if exists questions_write  on public.questions;
create policy questions_select on public.questions
  for select using (
    public.is_event_owner(event_id) or public.is_event_guest(event_id)
  );
create policy questions_write on public.questions
  for all using (public.is_event_owner(event_id))
  with check (public.is_event_owner(event_id));

-- Cross-guest visibility deliberately does NOT go through this table — see
-- public_leaderboard(), which exposes display name and balance only.
drop policy if exists guests_select on public.event_guests;
drop policy if exists guests_update on public.event_guests;
create policy guests_select on public.event_guests
  for select using (user_id = auth.uid() or public.is_event_owner(event_id));
create policy guests_update on public.event_guests
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No INSERT policy, by design. Bets are created only by place_bets().
drop policy if exists bets_select on public.bets;
create policy bets_select on public.bets
  for select using (
    public.is_event_owner(event_id)
    or guest_id in (select id from public.event_guests where user_id = auth.uid())
  );

drop policy if exists purchases_read on public.purchases;
create policy purchases_read on public.purchases
  for select using (owner_id = auth.uid());

-- analytics_events has no policies at all: write-only from a client's point of
-- view, via track(). Reporting uses the service role.

-- =============================================================================
-- GAME FUNCTIONS
-- =============================================================================

-- Create (or fetch) the caller's guest row. Enforces the guest cap. Idempotent.
create or replace function public.join_event(p_slug citext, p_display_name text)
  returns public.event_guests
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_event public.events;
  v_guest public.event_guests;
  v_count int;
  v_name  text := btrim(p_display_name);
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if length(v_name) = 0 then raise exception 'display_name_required'; end if;

  select * into v_event from public.events where slug = p_slug;
  if not found then raise exception 'event_not_found'; end if;
  if not v_event.published then raise exception 'event_not_open'; end if;

  -- Already joined → return the existing row (a guest reopening the link).
  select * into v_guest from public.event_guests
   where event_id = v_event.id and user_id = auth.uid();
  if found then return v_guest; end if;

  if v_event.status = 'closed' then raise exception 'event_closed'; end if;

  select count(*) into v_count from public.event_guests where event_id = v_event.id;
  if v_count >= v_event.max_guests then raise exception 'guest_limit_reached'; end if;

  insert into public.event_guests (event_id, user_id, display_name, balance)
  values (v_event.id, auth.uid(), v_name, v_event.starting_bankroll)
  returning * into v_guest;

  return v_guest;
end;
$$;

-- The only way money leaves a guest's balance.
--
-- Takes [{ question_id, pick, pick_label, wager }] and applies the whole slip
-- atomically: the event must be live, each question must belong to it and be
-- unsettled, the option must exist, and the guest must be able to afford the
-- total. Odds come from the QUESTION, never the payload.
create or replace function public.place_bets(p_event_id uuid, p_bets jsonb)
  returns int
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_guest    public.event_guests;
  v_event    public.events;
  v_item     jsonb;
  v_question public.questions;
  v_total    int := 0;
  v_placed   int := 0;
  v_odds     text;
  v_wager    int;
  v_rows     int;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then raise exception 'event_not_found'; end if;
  if v_event.status <> 'live' then raise exception 'event_not_live'; end if;

  select * into v_guest from public.event_guests
   where event_id = p_event_id and user_id = auth.uid()
   for update;                       -- serialise concurrent slips from one guest
  if not found then raise exception 'not_a_guest'; end if;

  -- Pass 1: validate everything and total the stake before writing anything.
  for v_item in select * from jsonb_array_elements(p_bets) loop
    v_wager := (v_item ->> 'wager')::int;
    if v_wager is null or v_wager < 1 then raise exception 'invalid_wager'; end if;

    select * into v_question from public.questions
     where id = (v_item ->> 'question_id')::uuid and event_id = p_event_id;
    if not found then raise exception 'question_not_found'; end if;
    if v_question.winner is not null then raise exception 'question_settled'; end if;

    select opt ->> 'odds' into v_odds
      from jsonb_array_elements(v_question.options) as opt
     where opt ->> 'id' = (v_item ->> 'pick');
    if v_odds is null then raise exception 'option_not_found'; end if;

    v_total := v_total + v_wager;
  end loop;

  if v_total > v_guest.balance then raise exception 'insufficient_balance'; end if;

  -- Pass 2: write. Duplicates (the guest already bet this question on another
  -- device) are skipped rather than sinking the whole slip.
  for v_item in select * from jsonb_array_elements(p_bets) loop
    v_wager := (v_item ->> 'wager')::int;

    select opt ->> 'odds' into v_odds
      from public.questions q, jsonb_array_elements(q.options) as opt
     where q.id = (v_item ->> 'question_id')::uuid
       and opt ->> 'id' = (v_item ->> 'pick');

    insert into public.bets
      (event_id, guest_id, question_id, pick, pick_label, wager, odds_at_bet)
    values
      (p_event_id, v_guest.id, (v_item ->> 'question_id')::uuid,
       v_item ->> 'pick', v_item ->> 'pick_label', v_wager, v_odds)
    on conflict (guest_id, question_id) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_placed := v_placed + 1;
      update public.event_guests
         set balance    = balance - v_wager,
             staked     = staked  + v_wager,
             bets_count = bets_count + 1
       where id = v_guest.id;
    end if;
  end loop;

  return v_placed;
end;
$$;

-- Declare (or clear) a winner and pay out, in one transaction. Host only.
-- Re-settling reverses the previous payout first, so a mis-tap is recoverable —
-- at a wedding this needs an undo, not a confirm dialog.
create or replace function public.settle_question(p_question_id uuid, p_winner text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_question public.questions;
begin
  select * into v_question from public.questions where id = p_question_id;
  if not found then raise exception 'question_not_found'; end if;
  if not public.is_event_owner(v_question.event_id) then
    raise exception 'not_authorised';
  end if;

  if v_question.winner is not null then
    update public.event_guests g
       set balance = g.balance - b.payout
      from public.bets b
     where b.question_id = p_question_id
       and b.guest_id = g.id
       and coalesce(b.payout, 0) <> 0;

    update public.bets set payout = null, settled_at = null
     where question_id = p_question_id;
  end if;

  if p_winner is null then
    update public.questions set winner = null, settled_at = null
     where id = p_question_id;
    return;
  end if;

  if not exists (
    select 1 from jsonb_array_elements(v_question.options) as opt
     where opt ->> 'id' = p_winner
  ) then
    raise exception 'option_not_found';
  end if;

  update public.questions set winner = p_winner, settled_at = now()
   where id = p_question_id;

  -- Stake was deducted at bet time, so this is the full return — matching
  -- returnOnWin() in lib/odds.js.
  update public.bets
     set payout = case
                    when pick = p_winner
                      then round(wager * public.odds_multiplier(odds_at_bet))::int
                    else 0
                  end,
         settled_at = now()
   where question_id = p_question_id;

  update public.event_guests g
     set balance = g.balance + b.payout
    from public.bets b
   where b.question_id = p_question_id
     and b.guest_id = g.id
     and b.payout > 0;
end;
$$;

-- Display name + balance for a published event.
--
-- DELIBERATELY PUBLIC, and worth restating: anyone holding an event id can read
-- guest display names and their play-money balances. No email, phone, or user
-- id is exposed.
--
-- The reason is caching. The leaderboard is byte-identical for all ~150 guests
-- at an event; if it required a per-user session it could not be shared in an
-- edge cache and every guest would recompute it on every poll. Public + cached
-- is what turns ~250 req/s into ~10 req/s at origin.
create or replace function public.public_leaderboard(p_event_id uuid)
  returns table (display_name text, balance int, bets_count int)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select g.display_name, g.balance, g.bets_count
    from public.event_guests g
    join public.events e on e.id = g.event_id
   where g.event_id = p_event_id
     and e.published = true
   order by g.balance desc, g.display_name asc
   limit 500;
$$;

-- Wipe a rehearsal. A wedding gets one attempt, so a Host needs to practise the
-- console and then clear the evidence. Refuses on a live event.
create or replace function public.reset_event(p_event_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_event public.events;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then raise exception 'event_not_found'; end if;
  if not public.is_event_owner(p_event_id) then raise exception 'not_authorised'; end if;

  if v_event.status = 'live' then
    raise exception 'cannot_reset_live_event'
      using hint = 'Close betting first. Resetting deletes every bet.';
  end if;

  delete from public.bets where event_id = p_event_id;

  update public.event_guests
     set balance = v_event.starting_bankroll, staked = 0, bets_count = 0
   where event_id = p_event_id;

  update public.questions set winner = null, settled_at = null
   where event_id = p_event_id;
end;
$$;

-- =============================================================================
-- PAYMENTS
-- =============================================================================

-- Called by the Stripe webhook with the service-role key. Idempotent on the
-- session id: Stripe retries deliveries, and a couple must never be charged
-- twice or have their tier applied twice.
create or replace function public.apply_purchase(
  p_event_id       uuid,
  p_tier           text,
  p_session_id     text,
  p_payment_intent text default null,
  p_amount_cents   int  default null
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_tier  public.tiers;
  v_event public.events;
begin
  select * into v_tier from public.tiers where key = p_tier;
  if not found then raise exception 'unknown_tier'; end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then raise exception 'event_not_found'; end if;

  if exists (select 1 from public.purchases where stripe_session_id = p_session_id) then
    return;
  end if;

  insert into public.purchases
    (event_id, owner_id, tier, amount_cents, stripe_session_id, stripe_payment_intent)
  values
    (p_event_id, v_event.owner_id, p_tier,
     coalesce(p_amount_cents, v_tier.price_cents), p_session_id, p_payment_intent);

  -- greatest() so a stray repeat purchase can never shrink a live event.
  update public.events
     set tier              = p_tier,
         max_guests        = greatest(max_guests, v_tier.max_guests),
         max_questions     = greatest(max_questions, v_tier.max_questions),
         stripe_session_id = p_session_id
   where id = p_event_id;
end;
$$;

-- =============================================================================
-- THEMING
-- =============================================================================

-- The only write path to events.theme. Tier gating cannot live in the UI —
-- a hidden button is not a permission.
--
-- The preset list must match the [data-preset] blocks in app/globals.css. A
-- preset accepted here with no CSS renders as the default and looks to the Host
-- like a broken button.
create or replace function public.set_event_theme(
  p_event_id    uuid,
  p_preset      text default null,
  p_accent      text default null,
  p_accent_deep text default null,
  p_logo_url    text default null
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_event public.events;
  v_tier  public.tiers;
  v_theme jsonb := '{}'::jsonb;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then raise exception 'event_not_found'; end if;
  if not public.is_event_owner(p_event_id) then raise exception 'not_authorised'; end if;

  select * into v_tier from public.tiers where key = v_event.tier;

  if p_preset is not null then
    if p_preset not in (
      'classic', 'midnight', 'garden', 'boho', 'neon', 'noir', 'blossom'
    ) then
      raise exception 'unknown_preset';
    end if;
    -- `classic` is the default look, not an upgrade, so it is always allowed.
    if p_preset <> 'classic' and not coalesce(v_tier.themes, false) then
      raise exception 'tier_lacks_themes';
    end if;
    v_theme := v_theme || jsonb_build_object('preset', p_preset);
  end if;

  if p_accent is not null or p_logo_url is not null then
    if not coalesce(v_tier.branding, false) then
      raise exception 'tier_lacks_branding';
    end if;
  end if;

  if p_accent is not null then
    -- "R G B" channel triples, because that is what
    -- rgb(var(--x) / <alpha-value>) needs. A hex value would silently break
    -- every opacity utility in the app.
    if p_accent !~ '^\d{1,3} \d{1,3} \d{1,3}$' then
      raise exception 'bad_accent_format';
    end if;
    v_theme := v_theme || jsonb_build_object('accent', p_accent);
    if p_accent_deep is not null then
      if p_accent_deep !~ '^\d{1,3} \d{1,3} \d{1,3}$' then
        raise exception 'bad_accent_format';
      end if;
      v_theme := v_theme || jsonb_build_object('accentDeep', p_accent_deep);
    end if;
  end if;

  if p_logo_url is not null then
    if p_logo_url <> '' and p_logo_url !~ '^https://' then
      raise exception 'bad_logo_url';
    end if;
    v_theme := v_theme || jsonb_build_object('logoUrl', nullif(p_logo_url, ''));
  end if;

  update public.events
     set theme = coalesce(theme, '{}'::jsonb) || v_theme
   where id = p_event_id
   returning theme into v_theme;

  return v_theme;
end;
$$;

-- =============================================================================
-- ANALYTICS & OPS
-- =============================================================================

-- The only write path into analytics_events. Inputs are length-checked so a
-- client cannot stuff the table.
create or replace function public.track(
  p_anon_id  text,
  p_name     text,
  p_event_id uuid  default null,
  p_props    jsonb default '{}'::jsonb
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if p_anon_id is null or length(p_anon_id) not between 8 and 64 then return; end if;
  if p_name is null or length(p_name) > 60 then return; end if;

  insert into public.analytics_events (event_id, anon_id, name, props)
  values (p_event_id, p_anon_id, p_name, coalesce(p_props, '{}'::jsonb));
end;
$$;

-- Cheap on purpose: the health probe must not be the thing that falls over when
-- the database is struggling. Reports live_events because during the season the
-- number that matters is not "is it up" but "how many weddings are mid-
-- reception right now" — that is the blast radius of an incident.
create or replace function public.health_check()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'live_events', (select count(*) from public.events where status = 'live')
  );
$$;

-- Reporting views. Service role only — they aggregate across every event.
create or replace view public.funnel_guest as
select
  e.id                                                              as event_id,
  e.title,
  count(distinct a.anon_id) filter (where a.name = 'event_viewed')   as scanned,
  count(distinct a.anon_id) filter (where a.name = 'auth_started')   as auth_started,
  count(distinct a.anon_id) filter (where a.name = 'auth_completed') as auth_completed,
  count(distinct a.anon_id) filter (where a.name = 'guest_joined')   as joined,
  count(distinct a.anon_id) filter (where a.name = 'first_bet')      as activated
from public.events e
left join public.analytics_events a on a.event_id = e.id
group by e.id, e.title;

-- The two numbers the PRD's kill criterion is written against.
create or replace view public.metric_kill_criterion as
select
  sum(auth_started)   as auth_started,
  sum(auth_completed) as auth_completed,
  case when sum(auth_started) > 0
       then round(100.0 * sum(auth_completed) / sum(auth_started), 1)
  end                 as signup_completion_pct,
  sum(scanned)        as scanned,
  sum(activated)      as activated,
  case when sum(scanned) > 0
       then round(100.0 * sum(activated) / sum(scanned), 1)
  end                 as activation_pct
from public.funnel_guest;

create or replace view public.funnel_host as
select
  (select count(*) from public.profiles)               as accounts,
  (select count(*) from public.events)                 as events_created,
  (select count(*) from (
      select event_id from public.questions
      group by event_id having count(*) >= 3) q)       as events_with_3_questions,
  (select count(*) from public.events where published) as events_published,
  (select count(distinct q.event_id) from public.questions q
    where q.winner is not null)                        as events_settled;

-- =============================================================================
-- GRANTS
--
-- Deliberately narrower than Supabase's defaults, which grant full CRUD on
-- everything and lean entirely on RLS. Defence in depth: a policy mistake on
-- `bets` still cannot become a write, because no client role holds INSERT on it.
-- =============================================================================

grant usage on schema public to anon, authenticated;

grant select                 on public.profiles     to authenticated;
grant update                 on public.profiles     to authenticated;
grant select                 on public.tiers        to anon, authenticated;
grant select                 on public.events       to anon, authenticated;
grant insert, update, delete on public.events       to authenticated;
grant select                 on public.questions    to anon, authenticated;
grant insert, update, delete on public.questions    to authenticated;
grant select, update         on public.event_guests to authenticated;
grant select                 on public.bets         to authenticated;
grant select                 on public.purchases    to authenticated;
-- No INSERT/UPDATE/DELETE on bets, purchases or analytics_events for any client
-- role, by design.

grant execute on function public.odds_multiplier(text)          to anon, authenticated;
grant execute on function public.public_leaderboard(uuid)       to anon, authenticated;
grant execute on function public.track(text, text, uuid, jsonb) to anon, authenticated;
grant execute on function public.health_check()                 to anon, authenticated;

grant execute on function public.join_event(citext, text)    to authenticated;
grant execute on function public.place_bets(uuid, jsonb)     to authenticated;
grant execute on function public.settle_question(uuid, text) to authenticated;
grant execute on function public.reset_event(uuid)           to authenticated;
grant execute on function public.set_event_theme(uuid, text, text, text, text)
                                                             to authenticated;

revoke all on function public.apply_purchase(uuid, text, text, text, int)
  from anon, authenticated;

revoke all on public.funnel_guest          from anon, authenticated;
revoke all on public.metric_kill_criterion from anon, authenticated;
revoke all on public.funnel_host           from anon, authenticated;

-- =============================================================================
-- STORAGE (logo uploads)
--
-- Guarded because the `storage` schema exists only on a real Supabase project —
-- the throwaway Postgres used by the test suite has no such schema.
-- =============================================================================
do $outer$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then

    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('event-logos', 'event-logos', true, 2097152,
            array['image/png','image/jpeg','image/webp','image/svg+xml'])
    on conflict (id) do update set
      public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    -- Objects live under <event_id>/..., so ownership is the first path segment.
    execute 'drop policy if exists "logos are publicly readable" on storage.objects';
    execute 'create policy "logos are publicly readable"
               on storage.objects for select
               using (bucket_id = ''event-logos'')';

    execute 'drop policy if exists "hosts write their own logos" on storage.objects';
    execute 'create policy "hosts write their own logos"
               on storage.objects for insert to authenticated
               with check (
                 bucket_id = ''event-logos''
                 and public.is_event_owner((storage.foldername(name))[1]::uuid)
               )';

    execute 'drop policy if exists "hosts replace their own logos" on storage.objects';
    execute 'create policy "hosts replace their own logos"
               on storage.objects for update to authenticated
               using (
                 bucket_id = ''event-logos''
                 and public.is_event_owner((storage.foldername(name))[1]::uuid)
               )';

    execute 'drop policy if exists "hosts delete their own logos" on storage.objects';
    execute 'create policy "hosts delete their own logos"
               on storage.objects for delete to authenticated
               using (
                 bucket_id = ''event-logos''
                 and public.is_event_owner((storage.foldername(name))[1]::uuid)
               )';

  end if;
end
$outer$;
