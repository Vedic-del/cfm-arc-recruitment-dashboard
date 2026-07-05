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
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate">No openings yet. Add your first role to start tracking the pipeline.</p>
        </div>
      ) : (
        <OpeningsTable openings={openings} />
      )}
    </div>
  );
}
