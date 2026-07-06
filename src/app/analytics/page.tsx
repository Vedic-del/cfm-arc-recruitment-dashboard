import Link from 'next/link';
import { getRoleAnalytics } from '@/lib/db/openings';
import { getStageCounts, getSourcePerformance } from '@/lib/db/pipeline';

const TERMINAL = ['Joined', 'Rejected', 'Dropped'];

function StatCard({ label, value, hint, tone = 'default' }: { label: string; value: string | number; hint?: string; tone?: 'default' | 'danger' | 'success' }) {
  const color = tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-forest-700' : 'text-forest-950';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate">{hint}</p>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const [roles, stageCounts, sources] = await Promise.all([
    getRoleAnalytics(),
    getStageCounts(),
    getSourcePerformance(12),
  ]);

  const totalLinks = Object.values(stageCounts).reduce((s, n) => s + n, 0);
  const active = Object.entries(stageCounts).filter(([s]) => !TERMINAL.includes(s)).reduce((s, [, n]) => s + n, 0);
  const joined = stageCounts['Joined'] ?? 0;
  const rejected = stageCounts['Rejected'] ?? 0;
  const dropped = stageCounts['Dropped'] ?? 0;
  const maxTotal = Math.max(1, ...roles.map((r) => r.total));

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Analytics</h1>
        <p className="mt-1 text-sm text-slate">Pipeline health across every role and source.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Candidates in pipeline" value={totalLinks} hint="across all roles" />
        <StatCard label="Active" value={active} hint="not yet closed out" tone="success" />
        <StatCard label="Joined" value={joined} hint="hired" tone="success" />
        <StatCard label="Rejected / dropped" value={rejected + dropped} hint={`${rejected} rejected · ${dropped} dropped`} tone="danger" />
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">By role</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                <th className="p-3">Role</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Active</th>
                <th className="p-3 text-right">Joined</th>
                <th className="p-3 text-right">Rejected</th>
                <th className="p-3 text-right">Dropped</th>
                <th className="p-3 w-32">Volume</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.openingId} className="border-b border-slate-100 last:border-0 hover:bg-slate-100/50">
                  <td className="p-3">
                    <Link href={`/openings/${r.openingId}`} className="font-medium text-forest-700 hover:text-forest-900 hover:underline">
                      {r.title}
                    </Link>
                    {r.status !== 'open' && <span className="ml-2 text-xs capitalize text-slate">· {r.status.replace('_', ' ')}</span>}
                  </td>
                  <td className="p-3 text-right font-semibold text-ink">{r.total}</td>
                  <td className="p-3 text-right text-forest-700">{r.active}</td>
                  <td className="p-3 text-right text-forest-900">{r.joined || '—'}</td>
                  <td className="p-3 text-right text-slate">{r.rejected || '—'}</td>
                  <td className="p-3 text-right text-slate">{r.dropped || '—'}</td>
                  <td className="p-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${(r.total / maxTotal) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {sources.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">By source</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="p-3">Source</th>
                  <th className="p-3 text-right">Sourced</th>
                  <th className="p-3 text-right">Advanced</th>
                  <th className="p-3 text-right">Rejected</th>
                  <th className="p-3 text-right">Hit rate</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source} className="border-b border-slate-100 last:border-0 hover:bg-slate-100/50">
                    <td className="p-3">
                      <Link href={`/candidates?source=${encodeURIComponent(s.source)}`} className="font-medium text-forest-700 hover:text-forest-900 hover:underline">
                        {s.source}
                      </Link>
                    </td>
                    <td className="p-3 text-right text-ink">{s.total}</td>
                    <td className="p-3 text-right font-semibold text-forest-700">{s.advanced}</td>
                    <td className="p-3 text-right text-slate">{s.rejected}</td>
                    <td className="p-3 text-right text-slate">{s.total > 0 ? Math.round((s.advanced / s.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
