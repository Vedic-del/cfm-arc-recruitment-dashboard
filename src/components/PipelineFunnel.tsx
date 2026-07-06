import { STAGES, type Stage } from '@/lib/types';

const ACTIVE_PATH: Stage[] = [
  'Sourced',
  'Screening',
  'Round 1',
  'Round 2',
  'HR/Offer Discussion',
  'Offer',
  'Joined',
];

// Progressive deepening of the brand green as candidates move down the funnel.
const BAR_COLORS = [
  '#4ade80',
  '#22c55e',
  '#16a34a',
  '#15803d',
  '#146c46',
  '#0f4c3a',
  '#08211a',
];

export function PipelineFunnel({ counts }: { counts: Record<string, number> }) {
  const activeRows = ACTIVE_PATH.map((stage, i) => ({
    stage,
    count: counts[stage] ?? 0,
    color: BAR_COLORS[i] ?? '#0f4c3a',
  }));
  const max = Math.max(1, ...activeRows.map((r) => r.count));
  const totalActive = activeRows.reduce((s, r) => s + r.count, 0);

  const rejected = counts['Rejected'] ?? 0;
  const dropped = counts['Dropped'] ?? 0;
  const hasAny = STAGES.some((s) => (counts[s] ?? 0) > 0);

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate">
          No one in the pipeline yet. Add candidates to an opening and the funnel fills in here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2.5">
        {activeRows.map((row) => {
          const pct = (row.count / max) * 100;
          return (
            <div key={row.stage} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-right text-xs font-medium text-slate">{row.stage}</span>
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100">
                <div
                  className="flex h-full items-center rounded-md px-2 transition-all duration-500"
                  style={{
                    width: `${Math.max(row.count > 0 ? 8 : 0, pct)}%`,
                    backgroundColor: row.color,
                  }}
                >
                  {row.count > 0 && (
                    <span className="text-xs font-bold text-white">{row.count}</span>
                  )}
                </div>
                {row.count === 0 && (
                  <span className="absolute inset-y-0 left-2 flex items-center text-xs text-slate">0</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate">
        <span>
          <span className="font-semibold text-forest-900">{totalActive}</span> active in pipeline
        </span>
        {rejected > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300" /> {rejected} rejected
          </span>
        )}
        {dropped > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300" /> {dropped} dropped
          </span>
        )}
      </div>
    </div>
  );
}
