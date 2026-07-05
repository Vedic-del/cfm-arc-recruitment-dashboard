import Link from 'next/link';
import { listCandidates } from '@/lib/db/candidates';

const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; minExperience?: string; maxSalary?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const candidates = await listCandidates({
    query: sp.query,
    minExperience: sp.minExperience ? Number(sp.minExperience) : undefined,
    maxSalary: sp.maxSalary ? Number(sp.maxSalary) : undefined,
    source: sp.source,
  });

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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                <th className="p-3">Name</th>
                <th className="p-3">Experience</th>
                <th className="p-3">Expected Salary</th>
                <th className="p-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-100/60">
                  <td className="p-3">
                    <Link href={`/candidates/${c.id}`} className="font-medium text-forest-700 hover:text-forest-900 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3 text-ink">{c.years_experience_total ?? '—'}</td>
                  <td className="p-3 text-ink">{c.expected_salary ?? '—'}</td>
                  <td className="p-3 text-slate">{c.source ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
