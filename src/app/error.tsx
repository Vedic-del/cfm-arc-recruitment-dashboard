'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-16 max-w-md animate-fade-in-up rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg">
        <span className="text-2xl">⚠️</span>
      </div>
      <h1 className="font-display text-lg font-bold text-forest-950">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate">
        That action didn&apos;t go through. It&apos;s usually temporary — try again, and if it keeps
        happening, note what you clicked so it can be fixed.
      </p>
      {error.message && (
        <p className="mt-3 rounded-lg bg-slate-100 p-2 text-xs text-slate break-words">{error.message}</p>
      )}
      <div className="mt-5 flex justify-center gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
