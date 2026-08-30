import Link from "next/link";
import { serverClient } from "../../lib/supabase";
import { signOut } from "../../lib/actions";
import EventCreator from "../../components/EventCreator";

export const metadata = { title: "Your events" };

const STATUS_LABEL = {
  draft: "Draft",
  live: "Live now",
  closed: "Closed",
};

export default async function DashboardPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, slug, status, tier, event_date, published")
    .order("created_at", { ascending: false });

  const list = events ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-mauve-deep">Your events</h1>
          <p className="mt-1 text-sm text-mauve/80">{user?.email}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <form action={signOut}>
            <button type="submit" className="btn-ghost px-4 py-2 text-sm">
              Sign out
            </button>
          </form>
          <Link
            href="/account"
            className="text-xs text-mauve underline underline-offset-4 hover:text-mauve-deep"
          >
            Account &amp; data
          </Link>
        </div>
      </div>

      {list.length > 0 && (
        <ul className="mt-8 space-y-3">
          {list.map((e) => (
            <li key={e.id}>
              <Link
                href={`/dashboard/${e.id}`}
                className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-2xl text-mauve-deep">
                    {e.title}
                  </h2>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      e.status === "live"
                        ? "bg-sage/20 text-sage"
                        : "bg-cream-deep text-mauve"
                    }`}
                  >
                    {STATUS_LABEL[e.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-mauve/75">
                  /e/{e.slug}
                  {e.event_date ? ` · ${e.event_date}` : ""}
                  {e.tier !== "free" ? ` · ${e.tier}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <EventCreator hasEvents={list.length > 0} />
      </div>
    </main>
  );
}
