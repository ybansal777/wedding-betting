import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/supabase";

// Uptime probe. Point a monitor at this and alert on non-200.
//
// It reports live_events on purpose: during the season the number that matters
// is not "is the site up" but "how many weddings are mid-reception right now",
// which is the blast radius of an incident at this exact moment. The same alert
// means something very different at 7pm on a Saturday than at 4am on a Tuesday.
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.rpc("health_check");
    const latency = Date.now() - started;

    if (error) {
      return NextResponse.json(
        { ok: false, error: "database_unreachable", latency_ms: latency },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: true, live_events: data?.live_events ?? 0, latency_ms: latency },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "not_configured", latency_ms: Date.now() - started },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
