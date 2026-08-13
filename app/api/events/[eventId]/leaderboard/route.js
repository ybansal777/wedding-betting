import { NextResponse } from "next/server";
import { serviceClient } from "../../../../../lib/supabase";

// The single highest value-to-effort change in the system.
//
// The leaderboard is byte-identical for every guest in an event, so one cached
// response serves all ~150 phones. Without this, 150 guests polling every 30s
// is 150 separate database aggregations for the same answer; with it, origin
// sees roughly one request per event per TTL window.
//
// `stale-while-revalidate` is what keeps it honest under load: a guest never
// waits on a cache miss, they get the slightly-stale board instantly while the
// refresh happens behind them.
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { eventId } = params;

  if (!/^[0-9a-f-]{36}$/i.test(eventId || "")) {
    return NextResponse.json({ error: "bad_event_id" }, { status: 400 });
  }

  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.rpc("public_leaderboard", {
      p_event_id: eventId,
    });

    if (error) return unavailable();

    return NextResponse.json(
      { entries: data ?? [] },
      {
        headers: {
          // 5s fresh, 25s stale-while-revalidate. Tuned against the 30s client
          // poll: every guest inside a window shares one origin read.
          "Cache-Control":
            "public, s-maxage=5, stale-while-revalidate=25, max-age=0",
        },
      }
    );
  } catch {
    // Missing service-role key, or the client failed to construct.
    return unavailable();
  }
}

// Degrade by withholding data, never by sending an empty board.
//
// Returning `200 {entries: []}` here would be worse than an error: the client
// maps the response straight into state, so a blip would visibly WIPE the
// standings off every phone at the reception. An error status means the client's
// `if (!res.ok) return` keeps the last good board on screen until we recover.
//
// The short cache matters too. During an incident, hundreds of guests polling a
// struggling database is exactly the pile-on that turns a blip into an outage —
// this lets the CDN absorb the retries.
function unavailable() {
  return NextResponse.json(
    { error: "unavailable" },
    {
      status: 503,
      headers: { "Cache-Control": "public, s-maxage=5, max-age=0" },
    }
  );
}
