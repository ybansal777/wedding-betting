// Shown while a server component streams. Every page here does at least one
// database round trip, so on venue wifi this is the difference between "loading"
// and "nothing happened when I tapped".
//
// Deliberately quiet: no spinner, because a spinner on a slow connection reads
// as stuck. Pulsing placeholders read as arriving.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col gap-4 px-4 pt-16">
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="mx-auto h-8 w-2/3 rounded-full bg-cream-deep" />
        <div className="card h-28 p-5" />
        <div className="card h-40 p-5" />
        <div className="card h-40 p-5" />
      </div>
      <p className="sr-only" role="status">
        Loading
      </p>
    </main>
  );
}
