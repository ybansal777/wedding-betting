import Link from "next/link";
import { redirect } from "next/navigation";
import { serverClient } from "../../lib/supabase";
import { signOut } from "../../lib/actions";
import DeleteAccount from "../../components/DeleteAccount";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/account");

  const [{ data: events }, { count: guestCount }] = await Promise.all([
    supabase.from("events").select("id, title, event_date"),
    supabase
      .from("event_guests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const hosted = events ?? [];

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 pb-24 pt-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-mauve-deep">Your account</h1>
          <p className="mt-1 text-sm text-mauve/80">
            {user.email || user.phone}
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn-ghost px-4 py-2 text-sm">
            Sign out
          </button>
        </form>
      </div>

      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">What we hold</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-mauve/85">
          <li>
            Sign-in identity: <strong>{user.email || user.phone}</strong>
          </li>
          <li>
            Events you host: <strong>{hosted.length}</strong>
          </li>
          <li>
            Weddings you play at: <strong>{guestCount ?? 0}</strong>
          </li>
        </ul>
        <p className="mt-3 text-xs text-mauve/70">
          Full detail is in the{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            privacy notice
          </Link>
          .
        </p>
      </section>

      {hosted.length > 0 && (
        <section className="card p-5">
          <h2 className="font-serif text-xl text-mauve-deep">Your events</h2>
          <ul className="mt-3 space-y-2">
            {hosted.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/dashboard/${e.id}`}
                  className="flex items-center justify-between rounded-xl bg-cream-deep/40 px-3 py-2 text-sm hover:bg-cream-deep/70"
                >
                  <span className="font-serif text-mauve-deep">{e.title}</span>
                  <span className="text-xs text-mauve/70">{e.event_date}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DeleteAccount eventCount={hosted.length} guestCount={guestCount ?? 0} />
    </main>
  );
}
