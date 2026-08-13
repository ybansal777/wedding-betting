import { NextResponse } from "next/server";
import { serverClient } from "../../../lib/supabase";

// OAuth and magic-link land here. Exchange the one-time code for a session,
// then send the user where they were actually going — for a guest that is the
// event they scanned, not a generic home page.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  // Only ever redirect within this app; `next` arrives from a query string.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await serverClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
