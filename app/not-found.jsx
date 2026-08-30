import Link from "next/link";

export const metadata = { title: "Not found" };

// The default Next.js 404 is a black-on-white developer page. A guest who
// mistypes a link, or scans a card for an event that was unpublished, should
// get something that looks like it belongs to the event they're attending —
// and a reason to believe they haven't broken anything.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="card w-full p-8">
        <p className="eyebrow text-blush-deep">Nothing here</p>
        <h1 className="mt-3 font-serif text-3xl text-mauve-deep">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mauve/85">
          If you scanned a code at an event, the host may not have opened the
          game yet — try again in a few minutes, or ask them for the link.
        </p>

        <div className="scallop-divider my-5">
          <span className="text-xs text-gold">◆</span>
        </div>

        <Link href="/" className="btn-primary block w-full py-3">
          Go to the front page
        </Link>
      </div>
    </main>
  );
}
