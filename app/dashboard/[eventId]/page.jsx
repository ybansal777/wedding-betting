import Link from "next/link";
import { notFound } from "next/navigation";
import { serverClient } from "../../../lib/supabase";
import { qrDataUrl } from "../../../lib/qr";
import HostConsole from "../../../components/HostConsole";

export const metadata = { title: "Control room" };

export default async function EventConsolePage({ params }) {
  const supabase = await serverClient();

  // RLS scopes this to the caller's own events, so a wrong id is simply "not
  // found" rather than a leak — no ownership check needed in application code.
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.eventId)
    .maybeSingle();

  if (!event) notFound();

  const [{ data: questions }, { data: guests }, { data: tiers }] =
    await Promise.all([
      supabase
        .from("questions")
        .select("*")
        .eq("event_id", event.id)
        .order("sort")
        .order("created_at"),
      supabase
        .from("event_guests")
        .select("id, display_name, balance, bets_count")
        .eq("event_id", event.id)
        .order("balance", { ascending: false }),
      supabase.from("tiers").select("*"),
    ]);

  // Generated on the server so the console never waits on an image service.
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "";
  const shareUrl = origin ? `${origin}/e/${event.slug}` : "";
  const qr = event.published && shareUrl ? await qrDataUrl(shareUrl) : null;

  return (
    <main className="mx-auto max-w-[90rem] px-4 pb-16 pt-6 lg:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-mauve underline underline-offset-4 hover:text-mauve-deep"
      >
        ← All events
      </Link>
      <HostConsole
        event={event}
        questions={questions ?? []}
        guests={guests ?? []}
        tiers={tiers ?? []}
        qr={qr}
        shareUrl={shareUrl}
      />
    </main>
  );
}
