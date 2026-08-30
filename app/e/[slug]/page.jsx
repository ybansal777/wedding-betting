import Link from "next/link";
import { notFound } from "next/navigation";
import { serverClient } from "../../../lib/supabase";
import GuestGame from "../../../components/GuestGame";
import Header from "../../../components/Header";
import Track from "../../../components/Track";
import Atmosphere from "../../../components/Atmosphere";

export async function generateMetadata({ params }) {
  const supabase = await serverClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, subtitle")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!event) return { title: "Event not found" };
  const who = event.subtitle ? `${event.title} — ${event.subtitle}` : event.title;
  return {
    title: who,
    description: `Place your bets at ${who}. Play money, real bragging rights.`,
    openGraph: { title: who, type: "website" },
  };
}

export default async function EventPage({ params }) {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!event || !event.published) notFound();

  const theme = event.theme || {};
  const preset = theme.preset || "classic";
  // A paid Host's accent flows into the same CSS variables every component
  // already reads, so nothing downstream needs to know about theming.
  const accentStyle = theme.accent
    ? {
        "--c-blush": theme.accent,
        "--c-blush-deep": theme.accentDeep || theme.accent,
      }
    : undefined;

  const shell = (children) => (
    <div
      className="relative min-h-[100dvh] bg-cream"
      data-event-shell
      data-preset={preset}
      style={accentStyle}
    >
      <Atmosphere />
      {/* Top of the guest funnel: a scan that reached the page. */}
      <Track name="event_viewed" eventId={event.id} />
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col gap-5 px-4 pb-28">
        <Header
          title={event.title}
          subtitle={event.subtitle}
          logoUrl={theme.logoUrl}
          bankroll={event.starting_bankroll}
        />
        {children}
      </main>
    </div>
  );

  // Signed out, or signed in but not yet a guest of this event.
  let guest = null;
  if (user) {
    const { data } = await supabase
      .from("event_guests")
      .select("*")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();
    guest = data;
  }

  if (!guest) {
    return shell(
      <section className="card animate-slide-up p-6 text-center shadow-glow">
        <p className="eyebrow mb-2 inline-flex items-center justify-center gap-2 text-sage">
          <span className="live-dot" />
          You&apos;re in
        </p>
        <h2 className="font-serif text-2xl tracking-tight text-mauve-deep">
          Take your chips
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-mauve/85">
          You&apos;ll get {event.starting_bankroll} coins to bet on how the night
          unfolds. It takes about ten seconds to join.
        </p>
        <Link
          href={`/e/${event.slug}/join`}
          className="btn-primary mt-5 block w-full py-3.5 text-base"
        >
          Join the game
        </Link>
      </section>
    );
  }

  const [{ data: questions }, { data: myBets }] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .eq("event_id", event.id)
      .order("sort")
      .order("created_at"),
    supabase.from("bets").select("*").eq("guest_id", guest.id),
  ]);

  return shell(
    <GuestGame
      event={event}
      guest={guest}
      questions={questions ?? []}
      initialBets={myBets ?? []}
    />
  );
}
