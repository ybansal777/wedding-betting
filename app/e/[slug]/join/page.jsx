import { notFound, redirect } from "next/navigation";
import { serverClient } from "../../../../lib/supabase";
import AuthPanel from "../../../../components/AuthPanel";
import GuestNameForm from "../../../../components/GuestNameForm";
import Track from "../../../../components/Track";
import Atmosphere from "../../../../components/Atmosphere";

export const metadata = { title: "Join the game" };

export default async function JoinPage({ params }) {
  const supabase = await serverClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, slug, title, subtitle, starting_bankroll, published, theme")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!event || !event.published) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already a guest? Skip straight to the game — a returning guest should never
  // be asked to join twice.
  if (user) {
    const { data: guest } = await supabase
      .from("event_guests")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (guest) redirect(`/e/${event.slug}`);
  }

  const who = event.title;
  const theme = event.theme || {};
  const preset = theme.preset || "classic";
  const accentStyle = theme.accent
    ? {
        "--c-blush": theme.accent,
        "--c-blush-deep": theme.accentDeep || theme.accent,
      }
    : undefined;

  return (
    <div
      className="relative min-h-[100dvh] bg-cream"
      data-event-shell
      data-preset={preset}
      style={accentStyle}
    >
      <Atmosphere />
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-5 px-4 py-10">
      {user ? (
        <>
          {/* Reaching this branch means auth succeeded — including the OAuth
              round-trip, which can't report completion from inside AuthPanel
              because the browser navigates away. The funnel views count
              distinct ids, so overlapping with the OTP path is harmless. */}
          <Track name="auth_completed" eventId={event.id} />
          <GuestNameForm
            slug={event.slug}
            eventId={event.id}
            who={who}
            bankroll={event.starting_bankroll}
            suggested={
              user.user_metadata?.full_name?.split(" ")[0] ||
              user.user_metadata?.name?.split(" ")[0] ||
              ""
            }
          />
        </>
      ) : (
        <AuthPanel
          mode="guest"
          eventId={event.id}
          redirectTo={`/e/${event.slug}/join`}
          title={`Join ${who}`}
          subtitle={`You'll get ${event.starting_bankroll} coins to play with. No app to install.`}
        />
      )}
    </main>
    </div>
  );
}
