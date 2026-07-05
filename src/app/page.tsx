import Link from 'next/link';
import { listOpenings, averageTimeToFill } from '@/lib/db/openings';
import { getStuckCandidates, getStageCounts, getAverageTimeInStage } from '@/lib/db/pipeline';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-forest-900',
  on_hold: 'bg-amber-100 text-amber-800',
  closed: 'bg-slate-100 text-slate',
  filled: 'bg-forest-900 text-green-100',
};

export default async function DashboardPage() {
  const openings = await listOpenings();
  const stuck = await getStuckCandidates();
  const stageCounts = await getStageCounts();
  const avgTimeInStage = await getAverageTimeInStage();
  const avgFill = await averageTimeToFill();

  const openingsByStatus: Record<string, number> = {};
  for (const o of openings) {
    openingsByStatus[o.status] = (openingsByStatus[o.status] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Recruitment Dashboard</h1>
        <p className="mt-1 text-sm text-slate">Where every opening stands, right now.</p>
      </div>

      <section className="animate-fade-in-up">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">Openings by status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(openingsByStatus).length === 0 && (
            <p className="text-sm text-slate">No openings yet — add one to get started.</p>
          )}
          {Object.entries(openingsByStatus).map(([status, count]) => (
            <div
              key={status}
              className="min-w-[120px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-display text-3xl font-bold text-forest-950">{count}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate'}`}>
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="animate-fade-in-up [animation-delay:60ms]">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">Candidates per stage</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stageCounts).length === 0 && (
            <p className="text-sm text-slate">No candidates in the pipeline yet.</p>
          )}
          {Object.entries(stageCounts).map(([stage, count]) => (
            <div
              key={stage}
              className="min-w-[110px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-display text-3xl font-bold text-forest-950">{count}</p>
              <p className="mt-1 text-xs font-medium text-slate">{stage}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm [animation-delay:120ms]">
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-slate">Average time to fill</h2>
          <p className="font-display text-2xl font-bold text-forest-950">
            {avgFill !== null ? (
              <>
                {avgFill.toFixed(1)} <span className="text-base font-medium text-slate">days</span>
              </>
            ) : (
              <span className="text-base font-medium text-slate">No filled openings yet</span>
            )}
          </p>
        </section>

        <section className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm [animation-delay:180ms]">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">Average time in stage (bottlenecks)</h2>
          {Object.entries(avgTimeInStage).length === 0 ? (
            <p className="text-sm text-slate">Not enough data yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {Object.entries(avgTimeInStage).map(([stage, days]) => (
                <li key={stage} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{stage}</span>
                  <span className="font-semibold text-forest-900">{days.toFixed(1)} days</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="animate-fade-in-up rounded-xl border border-danger/20 bg-white p-5 shadow-sm [animation-delay:240ms]">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-danger">
          Stuck candidates ({stuck.length})
        </h2>
        {stuck.length === 0 ? (
          <p className="text-sm text-slate">Nothing stuck — the pipeline is moving.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stuck.map((c) => (
              <li key={c.candidateOpeningId} className="flex items-center justify-between text-sm">
                <Link href={`/candidates/${c.candidateId}`} className="font-medium text-forest-700 hover:text-forest-900 hover:underline">
                  {c.candidateName}
                </Link>
                <span className="rounded-full border border-danger/20 bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">
                  stuck in {c.currentStage}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
