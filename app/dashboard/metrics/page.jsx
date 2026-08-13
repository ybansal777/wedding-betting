import Link from "next/link";
import { notFound } from "next/navigation";
import { serverClient, serviceClient } from "../../../lib/supabase";

export const metadata = { title: "Metrics" };
export const dynamic = "force-dynamic";

// Operator-only. Gated on an env allow-list rather than a role column, because
// there is exactly one operator and a roles table would be ceremony.
function isAdmin(email) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email) && allow.includes(email.toLowerCase());
}

// The PRD commits to dropping mandatory guest accounts if signup completion
// falls below 65% or activation below 30%. This page exists so that promise is
// checkable rather than aspirational.
const KILL = { signup: 65, activation: 30 };

function Stat({ label, value, suffix = "", tone = "neutral", note }) {
  const colour =
    tone === "bad"
      ? "text-blush-deep"
      : tone === "good"
        ? "text-sage-deep"
        : "text-mauve-deep";
  return (
    <div className="rounded-2xl bg-cream-deep/40 p-4">
      <p className="eyebrow text-mauve">{label}</p>
      <p className={`mt-1 font-serif text-3xl ${colour}`}>
        {value ?? "—"}
        {value !== null && value !== undefined ? suffix : ""}
      </p>
      {note && <p className="mt-1 text-xs text-mauve/70">{note}</p>}
    </div>
  );
}

export default async function MetricsPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 404 rather than 403 — an operator-only page shouldn't confirm it exists.
  if (!isAdmin(user?.email)) notFound();

  let kill = null;
  let host = null;
  let events = [];
  let unavailable = false;

  try {
    const admin = serviceClient();
    const [k, h, e] = await Promise.all([
      admin.from("metric_kill_criterion").select("*").maybeSingle(),
      admin.from("funnel_host").select("*").maybeSingle(),
      admin
        .from("funnel_guest")
        .select("*")
        .order("scanned", { ascending: false }),
    ]);
    kill = k.data;
    host = h.data;
    events = e.data ?? [];
  } catch {
    unavailable = true;
  }

  const signup = kill?.signup_completion_pct;
  const activation = kill?.activation_pct;
  const belowThreshold =
    (signup != null && signup < KILL.signup) ||
    (activation != null && activation < KILL.activation);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 pb-24 pt-10">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-mauve underline underline-offset-4"
        >
          ← Back to your events
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-mauve-deep">Metrics</h1>
      </div>

      {unavailable && (
        <p className="card p-5 text-sm text-mauve-deep">
          Couldn&apos;t reach the database. Check{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      )}

      {/* ------------------------------------------------ the kill criterion */}
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Kill criterion</h2>
        <p className="mt-1 text-xs text-mauve/70">
          Mandatory guest accounts are the product&apos;s biggest risk. Below{" "}
          {KILL.signup}% signup completion or {KILL.activation}% activation, the
          decision was wrong and a name-only guest mode ships.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat
            label="Guest signup completion"
            value={signup}
            suffix="%"
            tone={
              signup == null ? "neutral" : signup < KILL.signup ? "bad" : "good"
            }
            note={`${kill?.auth_completed ?? 0} of ${kill?.auth_started ?? 0} finished · threshold ${KILL.signup}%`}
          />
          <Stat
            label="Guest activation"
            value={activation}
            suffix="%"
            tone={
              activation == null
                ? "neutral"
                : activation < KILL.activation
                  ? "bad"
                  : "good"
            }
            note={`${kill?.activated ?? 0} of ${kill?.scanned ?? 0} scans bet · threshold ${KILL.activation}%`}
          />
        </div>

        {belowThreshold && (
          <p className="mt-3 rounded-xl bg-blush/10 p-3 text-sm text-mauve-deep">
            <strong>Below threshold.</strong> The pre-committed response is to
            ship a name-only guest mode, not to argue with the number.
          </p>
        )}

        {(kill?.auth_started ?? 0) < 30 && (
          <p className="mt-3 text-xs text-mauve/60">
            Sample is small ({kill?.auth_started ?? 0} signups). Don&apos;t act
            on this until a few real events have run.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------- host funnel */}
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">Hosts</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Accounts" value={host?.accounts} />
          <Stat label="Events created" value={host?.events_created} />
          <Stat label="3+ questions" value={host?.events_with_3_questions} />
          <Stat label="Published" value={host?.events_published} />
          <Stat label="Settled ≥1" value={host?.events_settled} />
        </div>
      </section>

      {/* --------------------------------------------------------- per event */}
      <section className="card p-5">
        <h2 className="font-serif text-xl text-mauve-deep">By event</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-mauve/70">No events yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-mauve/70">
                  <th className="pb-2">Event</th>
                  <th className="pb-2 text-right">Scanned</th>
                  <th className="pb-2 text-right">Signed in</th>
                  <th className="pb-2 text-right">Joined</th>
                  <th className="pb-2 text-right">Bet</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.event_id} className="border-t border-mauve/10">
                    <td className="py-2 pr-3 font-serif text-mauve-deep">
                      {e.title}
                    </td>
                    <td className="py-2 text-right tabular-nums">{e.scanned}</td>
                    <td className="py-2 text-right tabular-nums">
                      {e.auth_completed}
                    </td>
                    <td className="py-2 text-right tabular-nums">{e.joined}</td>
                    <td className="py-2 text-right tabular-nums">
                      {e.activated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
