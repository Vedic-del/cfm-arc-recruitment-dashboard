import Link from 'next/link';
import { listCandidates, getDistinctSources, type CandidateFilters } from '@/lib/db/candidates';
import { getStagesForCandidates } from '@/lib/db/pipeline';
import { listOpenings } from '@/lib/db/openings';
import { STAGES } from '@/lib/types';
import { CandidatesTable } from './CandidatesTable';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';
const PAGE_SIZE = 50;

type SP = {
  query?: string;
  minExperience?: string;
  maxSalary?: string;
  source?: string;
  openingId?: string;
  stage?: string;
  page?: string;
};

function buildQuery(sp: SP, overrides: Partial<SP>): string {
  const merged: SP = { ...sp, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filters: CandidateFilters = {
    query: sp.query || undefined,
    minExperience: sp.minExperience ? Number(sp.minExperience) : undefined,
    maxSalary: sp.maxSalary ? Number(sp.maxSalary) : undefined,
    source: sp.source || undefined,
    openingId: sp.openingId || undefined,
    stage: sp.stage || undefined,
  };

  const [{ candidates, total }, openings, sources] = await Promise.all([
    listCandidates({ ...filters, page: page - 1, pageSize: PAGE_SIZE }),
    listOpenings(),
    getDistinctSources(),
  ]);
  const stagesByCandidate = await getStagesForCandidates(candidates.map((c) => c.id));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const hasFilters = Boolean(
    filters.query || filters.minExperience || filters.maxSalary || filters.source || filters.openingId || filters.stage
  );

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Candidate Repository</h1>
          <p className="mt-1 text-sm text-slate">Every candidate ever sourced, searchable for future roles.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/candidates/duplicates"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
          >
            ⧉ Duplicates
          </Link>
          <Link
            href="/candidates/import"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
          >
            ⬆ Import
          </Link>
          <Link
            href="/candidates/new"
            className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
          >
            + Add Candidate
          </Link>
        </div>
      </div>

      <form className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          name="query"
          placeholder="Search name, email, phone, employer, designation, location…"
          defaultValue={sp.query}
          className={`${INPUT} mb-3`}
        />
        <div className="flex flex-wrap gap-3">
          <select name="openingId" defaultValue={sp.openingId ?? ''} className={`${INPUT} w-auto min-w-[150px] flex-1`}>
            <option value="">Any role</option>
            {openings.map((o) => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>
          <select name="stage" defaultValue={sp.stage ?? ''} className={`${INPUT} w-auto min-w-[130px]`}>
            <option value="">Any stage</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select name="source" defaultValue={sp.source ?? ''} className={`${INPUT} w-auto min-w-[150px] flex-1`}>
            <option value="">Any source</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input name="minExperience" type="number" placeholder="Min exp (yrs)" defaultValue={sp.minExperience} className={`${INPUT} w-32`} />
          <input name="maxSalary" type="number" placeholder="Max salary" defaultValue={sp.maxSalary} className={`${INPUT} w-32`} />
          <button type="submit" className="rounded-lg bg-forest-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700">
            Search
          </button>
          {hasFilters && (
            <Link href="/candidates" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate transition-colors hover:bg-slate-100">
              Clear
            </Link>
          )}
        </div>
      </form>

      {total === 0 ? (
        <div className="animate-fade-in-up rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">👥</div>
          <h2 className="font-display text-lg font-bold text-forest-950">
            {hasFilters ? 'No matches' : 'No candidates yet'}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate">
            {hasFilters
              ? 'Nobody matches these filters — try widening them or clearing.'
              : 'Import your existing spreadsheet, or add candidates one at a time.'}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {hasFilters ? (
              <Link href="/candidates" className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700">
                Clear filters
              </Link>
            ) : (
              <>
                <Link href="/candidates/import" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100">
                  ⬆ Import spreadsheet
                </Link>
                <Link href="/candidates/new" className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700">
                  + Add candidate
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <CandidatesTable
            candidates={candidates}
            stagesByCandidate={stagesByCandidate}
            total={total}
            rangeLabel={`Showing ${from}–${to} of ${total}`}
            exportFilters={filters}
          />
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-slate">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={`/candidates${buildQuery(sp, { page: String(page - 1) })}`}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="rounded-lg border border-slate-100 px-4 py-2 text-sm font-semibold text-slate-200">← Previous</span>
                )}
                {page < totalPages ? (
                  <Link
                    href={`/candidates${buildQuery(sp, { page: String(page + 1) })}`}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="rounded-lg border border-slate-100 px-4 py-2 text-sm font-semibold text-slate-200">Next →</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
