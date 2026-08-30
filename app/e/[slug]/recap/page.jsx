import Link from "next/link";
import { notFound } from "next/navigation";
import { serverClient } from "../../../../lib/supabase";
import { formatMoney } from "../../../../lib/odds";
import Atmosphere from "../../../../components/Atmosphere";

// The referral loop, and the thing that makes the game memorable rather than
// merely fun: a final standings page the winner will screenshot into a group
// chat. Public and shareable by design — it carries attribution back.
export async function generateMetadata({ params }) {
  const supabase = await serverClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, subtitle")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!event) return { title: "Recap" };
  const who = event.subtitle ? `${event.title} — ${event.subtitle}` : event.title;

  return {
    title: `${who} — final standings`,
    description: `How the betting finished at ${who}.`,
    openGraph: {
      title: `${who} — final standings`,
      description: "See who called it right.",
      type: "website",
    },
  };
}

export default async function RecapPage({ params }) {
  const supabase = await serverClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!event || !event.published) notFound();

  const { data: tier } = await supabase
    .from("tiers")
    .select("recap")
    .eq("key", event.tier)
    .maybeSingle();

  const [{ data: board }, { data: questions }] = await Promise.all([
    supabase.rpc("public_leaderboard", { p_event_id: event.id }),
    supabase
      .from("questions")
      .select("id, prompt, options, winner, bet_type, actual_value")
      .eq("event_id", event.id)
      .not("winner", "is", null)
      .order("sort"),
  ]);

  const theme = event.theme || {};
  const entries = board ?? [];
  const settled = questions ?? [];

  const labelFor = (q) => {
    if (q.bet_type === "line" && q.winner === "push") {
      return `Push at ${q.actual_value} — everyone refunded`;
    }
    const label =
      (Array.isArray(q.options) ? q.options : []).find((o) => o.id === q.winner)
        ?.label ?? "—";
    return q.bet_type === "line" && q.actual_value != null
      ? `${label} (actual: ${q.actual_value})`
      : label;
  };

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div
      className="relative min-h-[100dvh] bg-cream"
      data-event-shell
      data-preset={theme.preset || "classic"}
      style={
        theme.accent
          ? {
              "--c-blush": theme.accent,
              "--c-blush-deep": theme.accentDeep || theme.accent,
            }
          : undefined
      }
    >
      <Atmosphere />
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col gap-5 px-4 pb-16 pt-10">
        <header className="text-center">
          <p className="eyebrow inline-flex items-center gap-2 text-gold">
            <span className="live-dot" />
            Final standings
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-mauve-deep">
            {event.title}
          </h1>
          {event.subtitle && (
            <p className="mt-1 text-sm font-semibold text-blush-deep">
              {event.subtitle}
            </p>
          )}
          {event.event_date && (
            <p className="mt-1 text-sm text-mauve/70">{event.event_date}</p>
          )}
        </header>

        {!tier?.recap && (
          <section className="card p-5 text-center">
            <p className="text-sm text-mauve/85">
              The recap page is available on the Classic plan and up.
            </p>
          </section>
        )}

        {tier?.recap && (
          <>
            {podium.length > 0 && (
              <section className="card p-5">
                <h2 className="text-center font-serif text-2xl text-mauve-deep">
                  The winners
                </h2>
                <div className="scallop-divider my-4">
                  <span className="text-xs text-gold">◆</span>
                </div>
                <ol className="space-y-2">
                  {podium.map((e, i) => (
                    <li
                      key={e.display_name}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                        i === 0
                          ? "bg-gold/15 ring-1 ring-gold/40"
                          : "bg-cream-deep/40"
                      }`}
                    >
                      <span
                        className={`w-8 shrink-0 text-center font-serif text-2xl ${
                          i === 0 ? "text-gold" : "text-mauve"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-serif text-xl text-mauve-deep">
                        {e.display_name}
                      </span>
                      <span className="shrink-0 font-serif text-xl text-mauve-deep">
                        {formatMoney(e.balance)}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {settled.length > 0 && (
              <section className="card p-5">
                <h2 className="font-serif text-2xl text-mauve-deep">
                  How it went
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {settled.map((q) => (
                    <li key={q.id} className="rounded-2xl bg-cream-deep/40 p-3">
                      <p className="text-sm text-mauve/80">{q.prompt}</p>
                      <p className="mt-0.5 font-serif text-lg text-mauve-deep">
                        {labelFor(q)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {rest.length > 0 && (
              <section className="card p-5">
                <h2 className="font-serif text-xl text-mauve-deep">
                  Everyone else
                </h2>
                <ol className="mt-3 space-y-1">
                  {rest.map((e, i) => (
                    <li
                      key={e.display_name}
                      className="flex items-center justify-between px-1 py-1 text-sm"
                    >
                      <span className="min-w-0 truncate text-mauve-deep">
                        {i + 4}. {e.display_name}
                      </span>
                      <span className="shrink-0 text-mauve">
                        {formatMoney(e.balance)}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}

        <footer className="mt-auto pt-6 text-center">
          <div className="scallop-divider mb-4">
            <span className="text-xs text-gold">◆</span>
          </div>
          <p className="text-sm text-mauve/80">
            Want this at your next event?{" "}
            <Link href="/" className="font-semibold underline underline-offset-4">
              Set one up
            </Link>
          </p>
          <p className="mt-1 text-xs text-mauve/60">
            fake money · real bragging rights
          </p>
        </footer>
      </main>
    </div>
  );
}
