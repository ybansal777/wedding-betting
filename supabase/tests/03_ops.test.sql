-- =============================================================================
-- Rate limiting, export, custom slug, and retention.
-- Runs after 02_entitlements.test.sql. Event A is premium, event B is free.
-- =============================================================================

-- =============================================================================
-- Rate limiting
-- =============================================================================
reset role;

select public.ok(
  public.check_rate_limit('test:bucket', 3, '1 minute'),
  'first call inside the limit is allowed');
select public.ok(
  public.check_rate_limit('test:bucket', 3, '1 minute'),
  'second call is allowed');
select public.ok(
  public.check_rate_limit('test:bucket', 3, '1 minute'),
  'third call is allowed (at the limit)');
select public.ok(
  not public.check_rate_limit('test:bucket', 3, '1 minute'),
  'fourth call is refused');

-- Buckets are independent, so one noisy guest can't lock out the room.
select public.ok(
  public.check_rate_limit('test:other-bucket', 3, '1 minute'),
  'a different bucket is unaffected by an exhausted one');

-- track() drops over-limit calls silently rather than raising — analytics must
-- never break a guest's page.
do $$
declare
  v_before int;
  v_after  int;
begin
  select count(*) into v_before from public.analytics_events;
  for i in 1..70 loop
    perform public.track('flood-anon-id-0001', 'event_viewed', null, '{}'::jsonb);
  end loop;
  select count(*) into v_after from public.analytics_events;

  if v_after - v_before <= 60 then
    raise notice '  PASS  track() caps a flooding client at the limit (% rows)',
      v_after - v_before;
  else
    raise exception 'FAIL  track() wrote % rows, expected <= 60', v_after - v_before;
  end if;
end;
$$;

-- =============================================================================
-- Privileged functions are not client-callable.
--
-- Postgres grants EXECUTE to PUBLIC by default, and `revoke from anon` does not
-- undo that. These assertions exist because getting it wrong once already made
-- apply_purchase() reachable by any visitor — free Premium for anyone who read
-- the JS bundle.
-- =============================================================================
set role authenticated;
select public.test_login('11111111-1111-1111-1111-111111111111');

do $$
begin
  begin
    perform public.check_rate_limit('sneaky', 1, '1 minute');
    raise exception 'FAIL  check_rate_limit is callable by a client';
  exception when insufficient_privilege then
    raise notice '  PASS  check_rate_limit is not client-callable';
  end;

  -- The big one: this grants paid entitlements.
  begin
    perform public.apply_purchase(
      'aaaaaaaa-0000-0000-0000-000000000001', 'premium', 'cs_forged', null, 0);
    raise exception 'FAIL  apply_purchase is callable by a client (free Premium!)';
  exception when insufficient_privilege then
    raise notice '  PASS  apply_purchase is not client-callable';
  end;
end;
$$;

-- And as a signed-out visitor.
reset role;
set role anon;
select public.test_login(null);
do $$
begin
  begin
    perform public.apply_purchase(
      'aaaaaaaa-0000-0000-0000-000000000001', 'premium', 'cs_forged_anon', null, 0);
    raise exception 'FAIL  apply_purchase is callable by anon';
  exception when insufficient_privilege then
    raise notice '  PASS  apply_purchase is not callable by anon';
  end;

  begin
    perform public.purge_expired_events(0);
    raise exception 'FAIL  purge_expired_events is callable by anon';
  exception when insufficient_privilege then
    raise notice '  PASS  purge_expired_events is not callable by anon';
  end;
end;
$$;

reset role;
set role authenticated;
select public.test_login('11111111-1111-1111-1111-111111111111');

-- =============================================================================
-- Results export (premium)
-- =============================================================================
select public.ok(
  (select count(*) from public.export_event_results(
    'aaaaaaaa-0000-0000-0000-000000000001')) >= 1,
  'a premium host can export their results');

-- Free host, own event → refused.
select public.test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  begin
    perform public.export_event_results('bbbbbbbb-0000-0000-0000-000000000002');
    raise exception 'FAIL  a free host exported results';
  exception when others then
    if sqlerrm like '%tier_lacks_export%' then
      raise notice '  PASS  export is refused on the free tier';
    else
      raise;
    end if;
  end;

  -- Someone else's premium event → refused regardless of tier.
  begin
    perform public.export_event_results('aaaaaaaa-0000-0000-0000-000000000001');
    raise exception 'FAIL  a non-owner exported another wedding''s results';
  exception when others then
    if sqlerrm like '%not_authorised%' then
      raise notice '  PASS  export is refused to a non-owner';
    else
      raise;
    end if;
  end;
end;
$$;

-- =============================================================================
-- Custom slug (premium)
-- =============================================================================
select public.test_login('11111111-1111-1111-1111-111111111111');

select public.ok(
  public.set_event_slug('aaaaaaaa-0000-0000-0000-000000000001', 'nikesh-and-richa')
    = 'nikesh-and-richa',
  'a premium host can set a custom slug');

do $$
begin
  -- Shape.
  begin
    perform public.set_event_slug('aaaaaaaa-0000-0000-0000-000000000001', 'Bad Slug!');
    raise exception 'FAIL  a malformed slug was accepted';
  exception when others then
    if sqlerrm like '%slug_bad_format%' then
      raise notice '  PASS  a malformed slug is rejected';
    else raise; end if;
  end;

  begin
    perform public.set_event_slug('aaaaaaaa-0000-0000-0000-000000000001', 'ab');
    raise exception 'FAIL  a too-short slug was accepted';
  exception when others then
    if sqlerrm like '%slug_bad_length%' then
      raise notice '  PASS  a too-short slug is rejected';
    else raise; end if;
  end;

  -- Reserved words would shadow real routes.
  begin
    perform public.set_event_slug('aaaaaaaa-0000-0000-0000-000000000001', 'dashboard');
    raise exception 'FAIL  a reserved slug was accepted';
  exception when others then
    if sqlerrm like '%slug_reserved%' then
      raise notice '  PASS  a reserved slug is rejected';
    else raise; end if;
  end;

  -- Collisions: two weddings cannot share a printed QR code.
  begin
    perform public.set_event_slug('aaaaaaaa-0000-0000-0000-000000000001', 'wedding-b');
    raise exception 'FAIL  a taken slug was accepted';
  exception when others then
    if sqlerrm like '%slug_taken%' then
      raise notice '  PASS  a slug already in use is rejected';
    else raise; end if;
  end;
end;
$$;

-- Free tier cannot rename at all.
select public.test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  begin
    perform public.set_event_slug('bbbbbbbb-0000-0000-0000-000000000002', 'my-big-day');
    raise exception 'FAIL  a free host set a custom slug';
  exception when others then
    if sqlerrm like '%tier_lacks_branding%' then
      raise notice '  PASS  a custom slug is refused on the free tier';
    else raise; end if;
  end;
end;
$$;

-- =============================================================================
-- Retention purge
-- =============================================================================
reset role;

-- An old event and a recent one, so we can prove it deletes only the old.
insert into auth.users (id, email)
values ('66666666-6666-6666-6666-666666666666', 'old@example.com');

insert into public.events (id, owner_id, slug, title, event_date, published)
values
  ('eeeeeeee-0000-0000-0000-00000000000a',
   '66666666-6666-6666-6666-666666666666',
   'ancient-wedding', 'Ancient Wedding', current_date - interval '2 years', true),
  ('eeeeeeee-0000-0000-0000-00000000000b',
   '66666666-6666-6666-6666-666666666666',
   'recent-wedding', 'Recent Wedding', current_date - interval '1 month', true);

insert into public.questions (event_id, prompt, options)
values ('eeeeeeee-0000-0000-0000-00000000000a', 'Old question',
        '[{"id":"x","label":"A","odds":"+100"}]'::jsonb);

select public.ok(
  (select count(*) from public.purge_expired_events(12)) = 1,
  'the retention purge removes exactly the out-of-window event');

select public.ok(
  (select count(*) from public.events
    where id = 'eeeeeeee-0000-0000-0000-00000000000a') = 0,
  'the two-year-old event is gone');

select public.ok(
  (select count(*) from public.events
    where id = 'eeeeeeee-0000-0000-0000-00000000000b') = 1,
  'the one-month-old event is untouched');

select public.ok(
  (select count(*) from public.questions
    where event_id = 'eeeeeeee-0000-0000-0000-00000000000a') = 0,
  'purging an event cascades to its questions');

-- The purge is not client-callable.
set role authenticated;
do $$
begin
  begin
    perform public.purge_expired_events(0);
    raise exception 'FAIL  purge_expired_events is callable by a client';
  exception when insufficient_privilege then
    raise notice '  PASS  purge_expired_events is not client-callable';
  end;
end;
$$;

reset role;
select 'ALL OPS TESTS PASSED' as result;
