import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-cream px-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-xl font-bold text-primary-600">
        404
      </span>
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Page not found</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-charcoal/60">
          We could not find that page. Let us get you back on track.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-2xl bg-primary-500 px-5 text-base font-medium text-white shadow-soft transition-colors hover:bg-primary-600"
      >
        Back to start
      </Link>
    </main>
  );
}
