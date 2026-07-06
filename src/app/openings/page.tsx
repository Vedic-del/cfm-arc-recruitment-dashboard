import Link from 'next/link';
import { listOpeningsWithCounts } from '@/lib/db/openings';
import { OpeningsTable } from './OpeningsTable';

export default async function OpeningsPage() {
  const openings = await listOpeningsWithCounts();
  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Openings</h1>
          <p className="mt-1 text-sm text-slate">{openings.length} role{openings.length === 1 ? '' : 's'} tracked</p>
        </div>
        <Link
          href="/openings/new"
          className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
        >
          + Add Opening
        </Link>
      </div>

      {openings.length === 0 ? (
        <div className="animate-fade-in-up rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
            📋
          </div>
          <h2 className="font-display text-lg font-bold text-forest-950">No openings yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate">
            Add your first role to start tracking candidates through the pipeline.
          </p>
          <Link
            href="/openings/new"
            className="mt-5 inline-block rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
          >
            + Add your first opening
          </Link>
        </div>
      ) : (
        <OpeningsTable openings={openings} />
      )}
    </div>
  );
}
