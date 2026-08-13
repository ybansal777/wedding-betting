-- =============================================================================
-- Entitlement lock, purchase idempotency, and theme gating.
-- Runs after 01_rls.test.sql, reusing its fixtures.
-- =============================================================================

set role authenticated;
select public.test_login('11111111-1111-1111-1111-111111111111');

-- A host can still edit their own event's ordinary fields.
update public.events set title = 'Wedding A (renamed)'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.ok(
  (select title from public.events
    where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Wedding A (renamed)',
  'a host can still rename their own event');

-- But not their tier.
do $$
begin
  begin
    update public.events set tier = 'premium'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001';
    raise exception 'FAIL  host self-upgraded their tier';
  exception when others then
    if sqlerrm like '%entitlements_are_read_only%' then
      raise notice '  PASS  a host cannot raise their own tier';
    else
      raise;
    end if;
  end;

  begin
    update public.events set max_guests = 99999
     where id = 'aaaaaaaa-0000-0000-0000-000000000001';
    raise exception 'FAIL  host raised their own guest cap';
  exception when others then
    if sqlerrm like '%entitlements_are_read_only%' then
      raise notice '  PASS  a host cannot raise their own guest cap';
    else
      raise;
    end if;
  end;
end;
$$;

-- Nor can a host forge a purchase record.
do $$
begin
  begin
    insert into public.purchases (event_id, owner_id, tier, amount_cents)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'premium', 0);
    raise exception 'FAIL  a host forged a purchase row';
  exception when insufficient_privilege then
    raise notice '  PASS  a host cannot insert a purchase record';
  end;
end;
$$;

-- =============================================================================
-- Only two tiers are on offer.
-- =============================================================================
reset role;

select public.ok(
  (select count(*) from public.tiers) = 2,
  'exactly two tiers exist');
select public.ok(
  (select count(*) from public.tiers where key in ('free', 'premium')) = 2,
  'the two tiers are free and premium');
select public.ok(
  (select count(*) from public.tiers where key in ('classic', 'grand')) = 0,
  'the old classic and grand tiers are gone');

-- Premium unlocks everything — the point of collapsing the tiers.
select public.ok(
  (select themes and branding and recap and export
     from public.tiers where key = 'premium'),
  'premium unlocks every feature flag');
select public.ok(
  (select not themes and not branding and not recap and not export
     from public.tiers where key = 'free'),
  'free unlocks none of them');

-- The tier key is constrained, so a typo can't invent a third tier.
do $$
begin
  begin
    insert into public.tiers
      (key, label, price_cents, max_guests, max_questions)
    values ('deluxe', 'Deluxe', 9900, 100, 100);
    raise exception 'FAIL  a third tier was accepted';
  exception when check_violation then
    raise notice '  PASS  a third tier is rejected by the check constraint';
  end;
end;
$$;

-- =============================================================================
-- The webhook path.
-- =============================================================================
select public.apply_purchase(
  'aaaaaaaa-0000-0000-0000-000000000001', 'premium',
  'cs_test_123', 'pi_test_123', 3900);

select public.ok(
  (select tier from public.events
    where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'premium',
  'a completed purchase applies premium');

select public.ok(
  (select max_guests from public.events
    where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 100000,
  'premium raises the guest cap');

-- Stripe retries webhooks; replaying the same session must be a no-op.
select public.apply_purchase(
  'aaaaaaaa-0000-0000-0000-000000000001', 'premium',
  'cs_test_123', 'pi_test_123', 3900);

select public.ok(
  (select count(*) from public.purchases
    where stripe_session_id = 'cs_test_123') = 1,
  'a replayed webhook does not double-record the purchase');

-- =============================================================================
-- Theme gating — the headline premium feature.
-- =============================================================================
set role authenticated;
select public.test_login('11111111-1111-1111-1111-111111111111');

-- Event A is premium now, so every preset is available.
select public.set_event_theme(
  'aaaaaaaa-0000-0000-0000-000000000001', 'neon', null, null, null);
select public.ok(
  (select theme ->> 'preset' from public.events
    where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'neon',
  'a premium host can pick any theme');

select public.set_event_theme(
  'aaaaaaaa-0000-0000-0000-000000000001', null, '138 79 191', '113 65 157', null);
select public.ok(
  (select theme ->> 'accent' from public.events
    where id = 'aaaaaaaa-0000-0000-0000-000000000001') = '138 79 191',
  'a premium host can set a custom accent colour');

-- A preset with no matching CSS would render as the default and look broken.
do $$
begin
  begin
    perform public.set_event_theme(
      'aaaaaaaa-0000-0000-0000-000000000001', 'vaporwave', null, null, null);
    raise exception 'FAIL  an unknown preset was accepted';
  exception when others then
    if sqlerrm like '%unknown_preset%' then
      raise notice '  PASS  an unknown preset is rejected';
    else
      raise;
    end if;
  end;

  -- Hex would silently break every opacity utility in the app.
  begin
    perform public.set_event_theme(
      'aaaaaaaa-0000-0000-0000-000000000001', null, '#8a4fbf', null, null);
    raise exception 'FAIL  a hex accent was accepted';
  exception when others then
    if sqlerrm like '%bad_accent_format%' then
      raise notice '  PASS  accents must be "R G B" channel triples';
    else
      raise;
    end if;
  end;
end;
$$;

-- Event B is still free, and its host must not get premium looks by calling
-- the API directly — a hidden button is not a permission.
select public.test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  begin
    perform public.set_event_theme(
      'bbbbbbbb-0000-0000-0000-000000000002', 'boho', null, null, null);
    raise exception 'FAIL  a free host applied a premium theme';
  exception when others then
    if sqlerrm like '%tier_lacks_themes%' then
      raise notice '  PASS  a free host cannot apply a premium theme';
    else
      raise;
    end if;
  end;

  begin
    perform public.set_event_theme(
      'bbbbbbbb-0000-0000-0000-000000000002', null, '10 20 30', null, null);
    raise exception 'FAIL  a free host set a custom colour';
  exception when others then
    if sqlerrm like '%tier_lacks_branding%' then
      raise notice '  PASS  a free host cannot set a custom colour';
    else
      raise;
    end if;
  end;

  begin
    perform public.set_event_theme(
      'bbbbbbbb-0000-0000-0000-000000000002', null, null, null,
      'https://example.com/logo.png');
    raise exception 'FAIL  a free host set a logo';
  exception when others then
    if sqlerrm like '%tier_lacks_branding%' then
      raise notice '  PASS  a free host cannot set a logo';
    else
      raise;
    end if;
  end;
end;
$$;

-- Classic stays available to everyone: it is the default, not an upgrade.
select public.set_event_theme(
  'bbbbbbbb-0000-0000-0000-000000000002', 'classic', null, null, null);
select public.ok(
  (select theme ->> 'preset' from public.events
    where id = 'bbbbbbbb-0000-0000-0000-000000000002') = 'classic',
  'the classic theme stays free for everyone');

-- And a stranger cannot restyle someone else's wedding.
select public.test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  begin
    perform public.set_event_theme(
      'bbbbbbbb-0000-0000-0000-000000000002', 'classic', null, null, null);
    raise exception 'FAIL  a non-owner changed the theme';
  exception when others then
    if sqlerrm like '%not_authorised%' then
      raise notice '  PASS  only the host can change the theme';
    else
      raise;
    end if;
  end;
end;
$$;

reset role;
select 'ALL ENTITLEMENT TESTS PASSED' as result;
