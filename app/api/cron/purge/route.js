import { NextResponse } from "next/server";
import { serviceClient } from "../../../../lib/supabase";

// Honours the retention promise in the privacy notice: event data is deleted
// 12 months after the wedding.
//
// This endpoint deletes real customer data in bulk, so it refuses to run
// without a matching CRON_SECRET. A cron route with no auth is a delete button
// on the public internet.
export const dynamic = "force-dynamic";

const RETENTION_MONTHS = Number(process.env.RETENTION_MONTHS || 12);

async function handle(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.rpc("purge_expired_events", {
      p_months: RETENTION_MONTHS,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const purged = data ?? [];
    // Logged deliberately: deleting a couple's wedding data should leave a
    // trace, even though the data itself is gone.
    if (purged.length > 0) {
      console.info(
        `[retention] purged ${purged.length} event(s) older than ${RETENTION_MONTHS} months:`,
        purged.map((p) => p.purged_event_id).join(", ")
      );
    }

    return NextResponse.json({
      purged: purged.length,
      retention_months: RETENTION_MONTHS,
      events: purged.map((p) => ({
        id: p.purged_event_id,
        title: p.purged_title,
      })),
    });
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
}

// Vercel Cron issues GET; POST is here for manual runs with curl.
export const GET = handle;
export const POST = handle;
