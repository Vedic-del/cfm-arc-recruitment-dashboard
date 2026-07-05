import Link from 'next/link';
import { listCandidates } from '@/lib/db/candidates';
import { getStagesByCandidate } from '@/lib/db/pipeline';
import { CandidatesTable } from './CandidatesTable';

const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; minExperience?: string; maxSalary?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const [candidates, stagesByCandidate] = await Promise.all([
    listCandidates({
      query: sp.query,
      minExperience: sp.minExperience ? Number(sp.minExperience) : undefined,
      maxSalary: sp.maxSalary ? Number(sp.maxSalary) : undefined,
      source: sp.source,
    }),
    getStagesByCandidate(),
  ]);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Candidate Repository</h1>
          <p className="mt-1 text-sm text-slate">Every candidate ever sourced, searchable for future roles.</p>
        </div>
        <Link
          href="/candidates/new"
          className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
        >
          + Add Candidate
        </Link>
      </div>

      <form className="mb-5 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input name="query" placeholder="Search name / tags / source" defaultValue={sp.query} className={`${INPUT} flex-1 min-w-[180px]`} />
        <input name="minExperience" type="number" placeholder="Min experience" defaultValue={sp.minExperience} className={`${INPUT} w-40`} />
        <input name="maxSalary" type="number" placeholder="Max expected salary" defaultValue={sp.maxSalary} className={`${INPUT} w-44`} />
        <button type="submit" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100">
          Filter
        </button>
      </form>

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate">No candidates match yet — try widening the filters, or add a new candidate.</p>
        </div>
      ) : (
        <CandidatesTable candidates={candidates} stagesByCandidate={stagesByCandidate} />
      )}
    </div>
  );
}
