-- Test-only stub of the pieces of Supabase that 0001_multitenant.sql depends on.
--
-- ⚠️  NEVER run this against a real Supabase project. It creates a fake `auth`
-- schema whose uid() is settable from the session, which would let any caller
-- impersonate any user. It exists so the RLS policies can be exercised against a
-- throwaway Postgres container.

create schema if not exists auth;

-- Supabase provides these roles; the migration's GRANT statements need them.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- The real auth.uid() reads the request JWT. Here it reads a session setting so
-- a test can say "now act as this user".
create or replace function auth.uid()
  returns uuid
  language sql
  stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated;
grant select on auth.users to anon, authenticated;

-- Helper the tests use to switch identity.
create or replace function public.test_login(p_user uuid)
  returns void
  language sql
as $$
  select set_config('app.current_user_id', coalesce(p_user::text, ''), false);
$$;
