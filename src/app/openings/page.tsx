import Link from 'next/link';
import { listOpenings } from '@/lib/db/openings';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-forest-900',
  on_hold: 'bg-amber-100 text-amber-800',
  closed: 'bg-slate-100 text-slate',
  filled: 'bg-forest-900 text-green-100',
};

export default async function OpeningsPage() {
  const openings = await listOpenings();
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                <th className="p-3">Title</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Opened</th>
              </tr>
            </thead>
            <tbody>
              {openings.map((o) => (
                <tr key={o.id} className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-100/60">
                  <td className="p-3">
                    <Link href={`/openings/${o.id}`} className="font-medium text-forest-700 hover:text-forest-900 hover:underline">
                      {o.title}
                    </Link>
                  </td>
                  <td className="p-3 text-ink">{o.department}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[o.status] ?? 'bg-slate-100 text-slate'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3">
                    {o.priority === 'urgent' ? (
                      <span className="inline-block rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">Urgent</span>
                    ) : (
                      <span className="text-slate">Normal</span>
                    )}
                  </td>
                  <td className="p-3 text-slate">{o.date_opened}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
