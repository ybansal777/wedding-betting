-- =============================================================================
-- Patch an EXISTING Let's Bet (formerly Wedding Bets) project up to the
-- multi-event / two-bet-type schema.
--
-- Run this once in the Supabase SQL Editor of your already-provisioned
-- project. Everything here is additive except the two `drop column` lines
-- for the old partner fields — comment those two out if you want to keep
-- that data around instead of losing it.
--
-- Fresh, never-provisioned project? Skip this file — supabase/schema.sql
-- already has all of this baked in.
-- =============================================================================

alter table public.events
  add column if not exists event_type text not null default 'other',
  add column if not exists subtitle   text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_event_type_check'
  ) then
    alter table public.events
      add constraint events_event_type_check
      check (event_type in
        ('wedding', 'bachelor_bachelorette', 'birthday', 'family_reunion', 'other'));
  end if;
end;
$$;

-- Comment out this pair to keep partner_a/partner_b instead of dropping them.
alter table public.events drop column if exists partner_a;
alter table public.events drop column if exists partner_b;

alter table public.questions
  add column if not exists bet_type     text not null default 'guess',
  add column if not exists line_value   numeric,
  add column if not exists actual_value numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'questions_bet_type_check'
  ) then
    alter table public.questions
      add constraint questions_bet_type_check
      check (bet_type in ('guess', 'line'));
  end if;
end;
$$;

-- A different parameter list makes Postgres create a separate overload
-- alongside the old one rather than replacing it, so the stale 2-arg version
-- (which trusts a client-passed pick for every bet type) has to be dropped
-- explicitly — otherwise it would keep working, un-audited, forever.
drop function if exists public.settle_question(uuid, text);

-- Replace settle_question() with the 3-arg version — computes a line
-- question's winner (or a push) from a host-reported actual value instead of
-- trusting a client-passed pick. See supabase/schema.sql for the full
-- annotated version; this is byte-identical to it.
create or replace function public.settle_question(
  p_question_id  uuid,
  p_winner       text,
  p_actual_value numeric default null
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_question public.questions;
  v_winner   text;
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

  if v_question.bet_type = 'line' then
    if p_actual_value is null then
      update public.questions
         set winner = null, actual_value = null, settled_at = null
       where id = p_question_id;
      return;
    end if;

    v_winner := case
                  when p_actual_value > v_question.line_value then 'over'
                  when p_actual_value < v_question.line_value then 'under'
                  else 'push'
                end;

    update public.questions
       set winner = v_winner, actual_value = p_actual_value, settled_at = now()
     where id = p_question_id;

    update public.bets
       set payout = case
                      when v_winner = 'push' then wager
                      when pick = v_winner
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

    return;
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

revoke all on function public.settle_question(uuid, text, numeric) from public;
grant execute on function public.settle_question(uuid, text, numeric) to authenticated;

-- Replace the theme preset allow-list: blossom/boho/garden/midnight/noir/neon
-- are gone, replaced by event-flavored presets (game_night, birthday,
-- bachelorette, bachelor, reunion) alongside classic (now labelled "Wedding"
-- in the picker). classic and game_night are the two free looks; the other
-- four require the themes entitlement. Same signature as before, so this is
-- a normal in-place replace — no old overload to drop.
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
      'classic', 'game_night', 'birthday', 'bachelorette', 'bachelor', 'reunion'
    ) then
      raise exception 'unknown_preset';
    end if;
    if p_preset not in ('classic', 'game_night')
       and not coalesce(v_tier.themes, false) then
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

-- Any event already saved with an old preset key (blossom/boho/garden/
-- midnight/noir/neon) would otherwise reference a preset with no matching
-- CSS, which renders as the unstyled default — reset those to classic.
update public.events
   set theme = theme - 'preset'
 where theme ->> 'preset' in
   ('blossom', 'boho', 'garden', 'midnight', 'noir', 'neon');

-- PostgREST caches the table/function schema and won't see any of the above
-- until it reloads. The SQL Editor usually triggers this on its own, but a
-- fresh table or column showing up as "not found" right after running this
-- means the reload hasn't happened yet — this line forces it immediately.
notify pgrst, 'reload schema';
