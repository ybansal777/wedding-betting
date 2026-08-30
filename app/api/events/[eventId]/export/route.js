import { NextResponse } from "next/server";
import { serverClient } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "display_name",
  "balance",
  "staked",
  "bets_count",
  "question",
  "pick",
  "wager",
  "odds_at_bet",
  "payout",
  "settled",
  "placed_at",
];

// RFC 4180 quoting. Guest display names are free text — a name containing a
// comma would silently shift every following column, and one starting with `=`
// is a formula-injection vector when the file is opened in a spreadsheet.
function csvCell(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_request, { params }) {
  const { eventId } = params;
  const supabase = await serverClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Ownership and tier are both checked inside the function — the route is not
  // the security boundary, it just formats the answer.
  const { data, error } = await supabase.rpc("export_event_results", {
    p_event_id: eventId,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("tier_lacks_export")) {
      return NextResponse.json({ error: "upgrade_required" }, { status: 402 });
    }
    if (msg.includes("not_authorised")) {
      return NextResponse.json({ error: "not_authorised" }, { status: 403 });
    }
    if (msg.includes("event_not_found")) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }

  const rows = data ?? [];
  const body = [
    COLUMNS.join(","),
    ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(",")),
  ].join("\r\n");

  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .maybeSingle();

  const filename = `${event?.slug || "lets-bet"}-results.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Contains guest names and results — never let a CDN hold a copy.
      "Cache-Control": "private, no-store",
    },
  });
}
