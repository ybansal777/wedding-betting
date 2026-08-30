-- =============================================================================
-- Betting vs Live betting.
--
-- Existing events keep a sportsbook board (betting_mode = 'live') so published
-- odds stay visible. New events default to even-money Betting ('casual').
-- Casual questions may also carry an optional max_wager cap.
--
-- Fresh project? Skip this file — supabase/schema.sql already has all of this.
-- =============================================================================

alter table public.events
  add column if not exists betting_mode text;

update public.events
   set betting_mode = 'live'
 where betting_mode is null;

alter table public.events
  alter column betting_mode set default 'casual';

alter table public.events
  alter column betting_mode set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_betting_mode_check'
  ) then
    alter table public.events
      add constraint events_betting_mode_check
      check (betting_mode in ('casual', 'live'));
  end if;
end;
$$;

alter table public.questions
  add column if not exists max_wager int;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'questions_max_wager_check'
  ) then
    alter table public.questions
      add constraint questions_max_wager_check
      check (max_wager is null or max_wager >= 1);
  end if;
end;
$$;

-- Recreate place_bets so it enforces max_wager. Byte-identical to schema.sql.
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
   for update;
  if not found then raise exception 'not_a_guest'; end if;

  for v_item in select * from jsonb_array_elements(p_bets) loop
    v_wager := (v_item ->> 'wager')::int;
    if v_wager is null or v_wager < 1 then raise exception 'invalid_wager'; end if;

    select * into v_question from public.questions
     where id = (v_item ->> 'question_id')::uuid and event_id = p_event_id;
    if not found then raise exception 'question_not_found'; end if;
    if v_question.winner is not null then raise exception 'question_settled'; end if;
    if v_question.max_wager is not null and v_wager > v_question.max_wager then
      raise exception 'wager_too_high';
    end if;

    select opt ->> 'odds' into v_odds
      from jsonb_array_elements(v_question.options) as opt
     where opt ->> 'id' = (v_item ->> 'pick');
    if v_odds is null then raise exception 'option_not_found'; end if;

    v_total := v_total + v_wager;
  end loop;

  if v_total > v_guest.balance then raise exception 'insufficient_balance'; end if;

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

notify pgrst, 'reload schema';
