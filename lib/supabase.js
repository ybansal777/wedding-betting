import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lets the UI show a setup message instead of crashing before .env is filled in.
export const isConfigured = Boolean(URL && ANON);

/** Client-side Supabase, for components marked "use client". */
export function browserClient() {
  return createBrowserClient(URL, ANON);
}

/**
 * Server-side Supabase bound to the request's auth cookies.
 * Async because next/headers must be imported in a request scope.
 */
export async function serverClient() {
  const { cookies } = await import("next/headers");
  const store = cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // middleware.js refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS — never import this into a client
 * component, and never hand it a value that came from a request body without
 * validating it first. Used only by the cached public leaderboard route and
 * (later) the Stripe webhook, both of which run server-side only.
 */
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Refreshes the auth session on every request and rewrites the cookies onto the
 * response. Called from middleware.js — without it, server components see a
 * stale session and guests get bounced back to the join screen mid-reception.
 */
export async function updateSession(request, response) {
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
