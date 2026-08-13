import { NextResponse } from "next/server";
import { updateSession, isConfigured } from "./lib/supabase";

export async function middleware(request) {
  const response = NextResponse.next({ request });
  if (!isConfigured) return response;

  const user = await updateSession(request, response);

  // The host console is the only area that requires a session up front. Guest
  // routes stay open so a QR scan lands on the event, not on a login wall —
  // auth happens at /e/<slug>/join, after they can see what they're joining.
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  // Skip static assets and images — running auth refresh on those is pure cost.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)",
  ],
};
