import Link from "next/link";
import { notFound } from "next/navigation";
import { serverClient } from "../../../../lib/supabase";
import { qrDataUrl } from "../../../../lib/qr";

export const metadata = { title: "Table cards" };

// Print-ready table cards, six to an A4 sheet.
//
// This is how the product actually reaches guests, so it is built to survive a
// real printer: no background images (browsers drop them by default), dark text
// on white for the copy, and explicit break-inside rules.
export default async function CardsPage({ params }) {
  const supabase = await serverClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, slug, title, subtitle, starting_bankroll, published")
    .eq("id", params.eventId)
    .maybeSingle();

  if (!event) notFound();

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = `${origin}/e/${event.slug}`;
  const qr = origin ? await qrDataUrl(url, { size: 600, margin: 1 }) : null;

  const who = event.subtitle ? `${event.title} — ${event.subtitle}` : event.title;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 8mm; }
          .tcard { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mx-auto max-w-2xl px-4 pt-8">
        <Link
          href={`/dashboard/${event.id}`}
          className="text-sm text-mauve underline underline-offset-4"
        >
          ← Back to the control room
        </Link>
        <h1 className="mt-3 font-serif text-3xl text-mauve-deep">Table cards</h1>

        {!event.published && (
          <p className="mt-2 rounded-xl bg-blush/10 p-3 text-sm text-mauve-deep">
            This event isn&apos;t published yet, so a scanned code won&apos;t
            work. Publish it first, then print.
          </p>
        )}
        {!origin && (
          <p className="mt-2 rounded-xl bg-blush/10 p-3 text-sm text-mauve-deep">
            <code>NEXT_PUBLIC_SITE_URL</code> isn&apos;t set, so we can&apos;t
            build a scannable link yet. Set it and reload before printing.
          </p>
        )}
        <p className="mt-2 text-sm text-mauve/80">
          Six cards per sheet. Print, cut along the dashed lines, and put one on
          each table.
        </p>

        <button id="print-btn" type="button" className="btn-primary mt-4 px-6 py-3">
          Print these
        </button>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.getElementById('print-btn').addEventListener('click',function(){window.print()})",
          }}
        />
      </div>

      <div className="mx-auto mt-6 grid max-w-[210mm] grid-cols-2 gap-2 px-2 pb-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="tcard flex flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center"
            style={{
              minHeight: "88mm",
              background: "#FFFDF7",
              borderColor: "#C6B8C0",
            }}
          >
            <p
              className="font-serif text-lg"
              style={{ color: "#6B4E5E", margin: 0 }}
            >
              {who}
            </p>
            <p
              style={{
                fontSize: "10px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#9B8AA0",
                margin: "4px 0 10px",
              }}
            >
              Place your bets
            </p>

            {qr ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qr}
                alt={`QR code linking to ${url}`}
                style={{ width: "38mm", height: "38mm" }}
              />
            ) : (
              <p style={{ fontSize: "11px", color: "#6B4E5E" }}>
                Set NEXT_PUBLIC_SITE_URL to generate the code
              </p>
            )}

            <p
              style={{
                fontSize: "11px",
                color: "#6B4E5E",
                margin: "10px 0 0",
                fontWeight: 600,
              }}
            >
              Scan to play · {event.starting_bankroll} free coins
            </p>
            <p style={{ fontSize: "9px", color: "#9B8AA0", margin: "3px 0 0" }}>
              {url.replace(/^https?:\/\//, "")}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
