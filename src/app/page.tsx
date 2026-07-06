import Link from 'next/link';
import { listOpenings, averageTimeToFill } from '@/lib/db/openings';
import {
  getStuckCandidates,
  getStageCounts,
  getAverageTimeInStage,
  getUpcomingActions,
  getSourcePerformance,
} from '@/lib/db/pipeline';
import { PipelineFunnel } from '@/components/PipelineFunnel';

const TERMINAL = ['Joined', 'Rejected', 'Dropped'];

function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'danger' | 'success';
}) {
  const valueColor =
    tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-forest-700' : 'text-forest-950';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${valueColor}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const [openings, stuck, stageCounts, avgTimeInStage, avgFill, upcoming, sources] = await Promise.all([
    listOpenings(),
    getStuckCandidates(),
    getStageCounts(),
    getAverageTimeInStage(),
    averageTimeToFill(),
    getUpcomingActions(),
    getSourcePerformance(),
  ]);

  const openRoles = openings.filter((o) => o.status === 'open').length;
  const urgentRoles = openings.filter((o) => o.status === 'open' && o.priority === 'urgent').length;
  const activeInPipeline = Object.entries(stageCounts)
    .filter(([stage]) => !TERMINAL.includes(stage))
    .reduce((sum, [, count]) => sum + count, 0);
  const overdueCount = upcoming.filter((a) => isOverdue(a.nextActionDate)).length;

  const sortedBottlenecks = Object.entries(avgTimeInStage).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Recruitment Dashboard</h1>
        <p className="mt-1 text-sm text-slate">Where every opening stands, right now.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Open roles"
          value={openRoles}
          hint={urgentRoles > 0 ? `${urgentRoles} urgent` : 'across the org'}
          tone={urgentRoles > 0 ? 'danger' : 'default'}
        />
        <StatCard label="Active candidates" value={activeInPipeline} hint="in the pipeline" tone="success" />
        <StatCard
          label="Needs action"
          value={overdueCount}
          hint={overdueCount > 0 ? 'follow-ups overdue' : 'all caught up'}
          tone={overdueCount > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Avg time to fill"
          value={avgFill !== null ? `${avgFill.toFixed(0)}d` : '—'}
          hint={avgFill !== null ? 'from open to filled' : 'no filled roles yet'}
        />
      </section>

      <section className="animate-fade-in-up">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">
          Pipeline funnel
        </h2>
        <PipelineFunnel counts={stageCounts} />
      </section>

      {upcoming.length > 0 && (
        <section className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">
            Upcoming actions ({upcoming.length})
          </h2>
          <ul className="flex flex-col divide-y divide-slate-100">
            {upcoming.map((a) => {
              const overdue = isOverdue(a.nextActionDate);
              return (
                <li key={a.candidateOpeningId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
                  <span>
                    <Link
                      href={`/candidates/${a.candidateId}`}
                      className="font-medium text-forest-700 hover:text-forest-900 hover:underline"
                    >
                      {a.candidateName}
                    </Link>
                    <span className="text-slate"> · {a.openingTitle} · {a.currentStage}</span>
                    {a.nextStep && <span className="text-ink"> — {a.nextStep}</span>}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      overdue ? 'bg-danger-bg text-danger' : 'bg-green-100 text-forest-900'
                    }`}
                  >
                    {overdue ? `⚠ Overdue · ${a.nextActionDate}` : a.nextActionDate}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {sources.length > 0 && (
        <section className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">
            Source performance — who delivers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3 text-right">Sourced</th>
                  <th className="py-2 pr-3 text-right">Advanced</th>
                  <th className="py-2 pr-3 text-right">Rejected</th>
                  <th className="py-2 pl-3">Hit rate</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => {
                  const rate = s.total > 0 ? Math.round((s.advanced / s.total) * 100) : 0;
                  return (
                    <tr key={s.source} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3">
                        <Link
                          href={`/candidates?source=${encodeURIComponent(s.source)}`}
                          className="font-medium text-forest-700 hover:text-forest-900 hover:underline"
                        >
                          {s.source}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-right text-ink">{s.total}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-forest-700">{s.advanced}</td>
                      <td className="py-2 pr-3 text-right text-slate">{s.rejected}</td>
                      <td className="py-2 pl-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-slate">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate">
            “Advanced” = reached Round 1 or beyond. Click a source to see those candidates.
          </p>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="animate-fade-in-up rounded-xl border border-danger/20 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-danger">
            Stuck candidates ({stuck.length})
          </h2>
          {stuck.length === 0 ? (
            <p className="text-sm text-slate">Nothing stuck — the pipeline is moving.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stuck.map((c) => (
                <li key={c.candidateOpeningId} className="flex items-center justify-between gap-2 text-sm">
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

        <section className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">
            Bottlenecks — avg days in stage
          </h2>
          {sortedBottlenecks.length === 0 ? (
            <p className="text-sm text-slate">Not enough data yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sortedBottlenecks.map(([stage, days]) => (
                <li key={stage} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{stage}</span>
                  <span className="font-semibold text-forest-900">{days.toFixed(1)} days</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
