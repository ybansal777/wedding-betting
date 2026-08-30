-- =============================================================================
-- Tenant isolation and money-path tests.
--
-- The PRD calls cross-event data leakage a release blocker, so these are the
-- tests that matter most in the repo. They run as a NON-SUPERUSER role, because
-- Postgres exempts superusers and table owners from RLS — running them as
-- postgres would make every policy look like it works.
--
-- Run: ./scripts/test-rls.sh
-- =============================================================================

\set ON_ERROR_STOP on
\timing off

create or replace function public.ok(cond boolean, label text)
  returns void
  language plpgsql
as $$
begin
  if cond then
    raise notice '  PASS  %', label;
  else
    raise exception 'FAIL  %', label;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Fixtures: two unrelated weddings, each with a host and a guest.
-- -----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'hostA@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'hostB@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'guestA@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'guestB@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'outsider@example.com');

insert into public.events
  (id, owner_id, slug, title, published, status, starting_bankroll, max_guests, max_questions)
values
  ('aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'wedding-a', 'Wedding A', true, 'live', 100, 50, 20),
  ('bbbbbbbb-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222',
   'wedding-b', 'Wedding B', true, 'live', 100, 50, 20);

insert into public.questions (id, event_id, prompt, options) values
  ('cccccccc-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Who cries first at A?',
   '[{"id":"o1","label":"Partner A","odds":"+150"},
     {"id":"o2","label":"Partner B","odds":"-200"}]'::jsonb),
  ('dddddddd-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000002',
   'Who cries first at B?',
   '[{"id":"p1","label":"Partner A","odds":"+150"},
     {"id":"p2","label":"Partner B","odds":"-200"}]'::jsonb);

-- Everything above ran as the owner. From here on, act as a normal user.
set role authenticated;

-- -----------------------------------------------------------------------------
-- Guests join their own events.
-- -----------------------------------------------------------------------------
select public.test_login('33333333-3333-3333-3333-333333333333');
select public.join_event('wedding-a', 'Guest A');

select public.test_login('44444444-4444-4444-4444-444444444444');
select public.join_event('wedding-b', 'Guest B');

-- =============================================================================
-- Tenant isolation
-- =============================================================================
select public.test_login('11111111-1111-1111-1111-111111111111');

select public.ok(
  (select count(*) from public.questions
    where event_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 0,
  'host A cannot read host B''s questions');

select public.ok(
  (select count(*) from public.event_guests
    where event_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 0,
  'host A cannot read host B''s guest list (identities stay private)');

-- Host A tries to edit host B's question.
update public.questions set prompt = 'HIJACKED'
 where id = 'dddddddd-0000-0000-0000-000000000002';
select public.test_login('22222222-2222-2222-2222-222222222222');
select public.ok(
  (select count(*) from public.questions
    where id = 'dddddddd-0000-0000-0000-000000000002' and prompt = 'HIJACKED') = 0,
  'host A cannot edit host B''s question');

-- Host A tries to delete host B's event.
select public.test_login('11111111-1111-1111-1111-111111111111');
delete from public.events where id = 'bbbbbbbb-0000-0000-0000-000000000002';
select public.test_login('22222222-2222-2222-2222-222222222222');
select public.ok(
  (select count(*) from public.events
    where id = 'bbbbbbbb-0000-0000-0000-000000000002') = 1,
  'host A cannot delete host B''s event');

-- A guest of A sees A's questions but not B's.
select public.test_login('33333333-3333-3333-3333-333333333333');
select public.ok(
  (select count(*) from public.questions
    where event_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1,
  'guest A can read their own event''s questions');
select public.ok(
  (select count(*) from public.questions
    where event_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 0,
  'guest A cannot read another event''s questions');

-- Someone with an account but no invitation sees no questions at all.
select public.test_login('55555555-5555-5555-5555-555555555555');
select public.ok(
  (select count(*) from public.questions) = 0,
  'a non-guest reads no questions from any event');
select public.ok(
  (select count(*) from public.event_guests) = 0,
  'a non-guest reads no guest rows from any event');

-- =============================================================================
-- Money path
-- =============================================================================
select public.test_login('33333333-3333-3333-3333-333333333333');

-- Direct writes to bets are impossible: there is no INSERT policy at all.
do $$
declare
  v_guest uuid;
begin
  select id into v_guest from public.event_guests where user_id = auth.uid();
  begin
    insert into public.bets
      (event_id, guest_id, question_id, pick, wager, odds_at_bet)
    values
      ('aaaaaaaa-0000-0000-0000-000000000001', v_guest,
       'cccccccc-0000-0000-0000-000000000001', 'o1', 1, '+99999');
    raise exception 'FAIL  direct bet insert should be denied by RLS';
  exception
    when insufficient_privilege then
      raise notice '  PASS  direct bet insert is denied (no INSERT policy)';
  end;
end;
$$;

-- Balance is enforced inside the transaction, not in the client.
do $$
begin
  begin
    perform public.place_bets(
      'aaaaaaaa-0000-0000-0000-000000000001',
      '[{"question_id":"cccccccc-0000-0000-0000-000000000001","pick":"o1","wager":500}]'::jsonb);
    raise exception 'FAIL  overspending should be rejected';
  exception when others then
    if sqlerrm like '%insufficient_balance%' then
      raise notice '  PASS  cannot bet more than the balance covers';
    else
      raise;
    end if;
  end;
end;
$$;

-- A forged price is ignored: odds come from the question row.
select public.place_bets(
  'aaaaaaaa-0000-0000-0000-000000000001',
  '[{"question_id":"cccccccc-0000-0000-0000-000000000001","pick":"o1",
     "pick_label":"Partner A","wager":10,"odds":"+100000"}]'::jsonb);

select public.ok(
  (select odds_at_bet from public.bets
    where question_id = 'cccccccc-0000-0000-0000-000000000001') = '+150',
  'client-supplied odds are ignored; the question''s price is used');

select public.ok(
  (select balance from public.event_guests where user_id = auth.uid()) = 90,
  'balance is debited by the wager');

-- Betting into someone else's event fails.
do $$
begin
  begin
    perform public.place_bets(
      'bbbbbbbb-0000-0000-0000-000000000002',
      '[{"question_id":"dddddddd-0000-0000-0000-000000000002","pick":"p1","wager":5}]'::jsonb);
    raise exception 'FAIL  cross-event betting should be rejected';
  exception when others then
    if sqlerrm like '%not_a_guest%' or sqlerrm like '%question_not_found%' then
      raise notice '  PASS  cannot bet into an event you have not joined';
    else
      raise;
    end if;
  end;
end;
$$;

-- One bet per guest per question.
select public.ok(
  public.place_bets(
    'aaaaaaaa-0000-0000-0000-000000000001',
    '[{"question_id":"cccccccc-0000-0000-0000-000000000001","pick":"o2","wager":5}]'::jsonb) = 0,
  'a second bet on the same question is skipped, not double-charged');
select public.ok(
  (select balance from public.event_guests where user_id = auth.uid()) = 90,
  'the skipped duplicate did not move the balance');

-- =============================================================================
-- Settlement
-- =============================================================================
-- A guest cannot settle.
do $$
begin
  begin
    perform public.settle_question('cccccccc-0000-0000-0000-000000000001', 'o1');
    raise exception 'FAIL  a guest should not be able to settle';
  exception when others then
    if sqlerrm like '%not_authorised%' then
      raise notice '  PASS  a guest cannot settle a question';
    else
      raise;
    end if;
  end;
end;
$$;

-- Nor can a different host.
select public.test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  begin
    perform public.settle_question('cccccccc-0000-0000-0000-000000000001', 'o1');
    raise exception 'FAIL  another host should not be able to settle';
  exception when others then
    if sqlerrm like '%not_authorised%' or sqlerrm like '%question_not_found%' then
      raise notice '  PASS  another event''s host cannot settle';
    else
      raise;
    end if;
  end;
end;
$$;

-- The real host settles: +150 on a 10 wager returns 25.
select public.test_login('11111111-1111-1111-1111-111111111111');
select public.settle_question('cccccccc-0000-0000-0000-000000000001', 'o1');

select public.ok(
  (select balance from public.event_guests
    where user_id = '33333333-3333-3333-3333-333333333333') = 115,
  'winning payout matches returnOnWin(): 90 + 25 = 115');

-- Re-settling to the other option reverses the first payout.
select public.settle_question('cccccccc-0000-0000-0000-000000000001', 'o2');
select public.ok(
  (select balance from public.event_guests
    where user_id = '33333333-3333-3333-3333-333333333333') = 90,
  're-settling reverses the previous payout (the mis-tap undo)');

-- Clearing the winner puts the bet back to riding.
select public.settle_question('cccccccc-0000-0000-0000-000000000001', null);
select public.ok(
  (select balance from public.event_guests
    where user_id = '33333333-3333-3333-3333-333333333333') = 90,
  'clearing a winner leaves the stake deducted and nothing paid out');
select public.ok(
  (select winner from public.questions
    where id = 'cccccccc-0000-0000-0000-000000000001') is null,
  'clearing a winner unsets it');

-- =============================================================================
-- event_type and bet_type are constrained
-- =============================================================================
do $$
begin
  begin
    insert into public.events (owner_id, slug, title, event_type)
    values ('11111111-1111-1111-1111-111111111111', 'bad-event-type', 'Bad',
            'quinceanera');
    raise exception 'FAIL  an unknown event_type was accepted';
  exception when check_violation then
    raise notice '  PASS  an unknown event_type is rejected';
  end;

  begin
    insert into public.questions (event_id, prompt, bet_type)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'Bad bet type', 'parlay');
    raise exception 'FAIL  an unknown bet_type was accepted';
  exception when check_violation then
    raise notice '  PASS  an unknown bet_type is rejected';
  end;
end;
$$;

-- =============================================================================
-- Line bets: Over/Under, a computed (never client-supplied) winner, and a push
-- =============================================================================
insert into public.questions
  (id, event_id, prompt, bet_type, line_value, options)
values
  ('cccccccc-0000-0000-0000-000000000010',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'How many songs before cake cutting?', 'line', 10,
   '[{"id":"over","label":"Over 10","odds":"-110"},
     {"id":"under","label":"Under 10","odds":"-110"}]'::jsonb);

select public.test_login('33333333-3333-3333-3333-333333333333');
select public.place_bets(
  'aaaaaaaa-0000-0000-0000-000000000001',
  '[{"question_id":"cccccccc-0000-0000-0000-000000000010","pick":"under","wager":10}]'::jsonb);

select public.ok(
  (select balance from public.event_guests
    where user_id = '33333333-3333-3333-3333-333333333333') = 80,
  'a line wager is debited exactly like a guess wager');

-- Actual value (8) lands below the line (10): Under wins.
select public.test_login('11111111-1111-1111-1111-111111111111');
select public.settle_question('cccccccc-0000-0000-0000-000000000010', null, 8);

select public.ok(
  (select winner from public.questions
    where id = 'cccccccc-0000-0000-0000-000000000010') = 'under',
  'the winner is computed from the actual value, never a client-passed pick');
select public.ok(
  (select actual_value from public.questions
    where id = 'cccccccc-0000-0000-0000-000000000010') = 8,
  'the actual value is stored');
select public.ok(
  (select balance from public.event_guests
    where user_id = '33333333-3333-3333-3333-333333333333') = 99,
  'Under wins at -110 on a 10 wager: 80 + 19 = 99');

-- Re-settling with the actual value equal to the line is a push: the previous
-- payout is reversed first, then every bet on the question is refunded in
-- full, netting to zero against the stake taken at bet time.
select public.settle_question('cccccccc-0000-0000-0000-000000000010', null, 10);

select public.ok(
  (select winner from public.questions
    where id = 'cccccccc-0000-0000-0000-000000000010') = 'push',
  'an exact tie settles as a push');
select public.ok(
  (select balance from public.event_guests
    where user_id = '33333333-3333-3333-3333-333333333333') = 90,
  'a push nets to zero: the prior win reverses (99-19=80), then refunds (80+10=90)');

-- A guest cannot settle a line question either.
select public.test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  begin
    perform public.settle_question('cccccccc-0000-0000-0000-000000000010', null, 12);
    raise exception 'FAIL  a guest should not be able to settle a line question';
  exception when others then
    if sqlerrm like '%not_authorised%' then
      raise notice '  PASS  a guest cannot settle a line question';
    else
      raise;
    end if;
  end;
end;
$$;

-- =============================================================================
-- public_leaderboard exposes only what it should
-- =============================================================================
reset role;
set role anon;
select public.test_login(null);

select public.ok(
  (select count(*) from public.public_leaderboard(
    'aaaaaaaa-0000-0000-0000-000000000001')) = 1,
  'the public leaderboard is readable without a session (this is deliberate)');

-- Two acceptable outcomes here, and we accept both: the table privilege is not
-- granted to anon at all (what actually happens — defence in depth), or the
-- grant exists and RLS returns nothing. Either way no guest data escapes.
do $$
declare
  n int;
begin
  begin
    select count(*) into n from public.event_guests;
    if n = 0 then
      raise notice '  PASS  anon reads no guest rows (RLS)';
    else
      raise exception 'FAIL  anon read % guest rows', n;
    end if;
  exception when insufficient_privilege then
    raise notice '  PASS  anon has no privilege on event_guests at all';
  end;

  begin
    select count(*) into n from public.bets;
    if n = 0 then
      raise notice '  PASS  anon reads no bets (RLS)';
    else
      raise exception 'FAIL  anon read % bets', n;
    end if;
  exception when insufficient_privilege then
    raise notice '  PASS  anon has no privilege on bets at all';
  end;
end;
$$;

reset role;
select 'ALL RLS TESTS PASSED' as result;
