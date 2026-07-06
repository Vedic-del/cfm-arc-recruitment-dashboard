'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bulkDeleteOpeningsAction } from './actions';
import { Spinner } from '@/components/Spinner';
import type { OpeningWithCount } from '@/lib/db/openings';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-forest-900',
  on_hold: 'bg-amber-100 text-amber-800',
  closed: 'bg-slate-100 text-slate',
  filled: 'bg-forest-900 text-green-100',
};

export function OpeningsTable({ openings }: { openings: OpeningWithCount[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const allSelected = openings.length > 0 && selected.size === openings.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(openings.map((o) => o.id)));
  }

  async function handleBulkDelete() {
    const count = selected.size;
    const confirmed = confirm(
      `Delete ${count} opening${count === 1 ? '' : 's'}? Linked candidates stay in the candidate repository — only these openings and their pipeline history will be removed. This can't be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await bulkDeleteOpeningsAction(Array.from(selected));
      setSelected(new Set());
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="mb-3 flex animate-fade-in-up items-center justify-between rounded-lg border border-danger/30 bg-danger-bg px-4 py-2.5">
          <span className="text-sm font-medium text-danger">{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-white px-3 py-1.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting && <Spinner className="h-3.5 w-3.5" />}
            {deleting ? 'Deleting…' : 'Delete selected'}
          </button>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate">
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all openings"
                />
              </th>
              <th className="p-3">Title</th>
              <th className="p-3">Department</th>
              <th className="p-3">Candidates</th>
              <th className="p-3">Status</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Opened</th>
            </tr>
          </thead>
          <tbody>
            {openings.map((o) => (
              <tr
                key={o.id}
                className={`border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-100/60 ${selected.has(o.id) ? 'bg-green-100/40' : ''}`}
              >
                <td className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    aria-label={`Select ${o.title}`}
                  />
                </td>
                <td className={`p-3 ${o.priority === 'urgent' ? 'border-l-2 border-danger' : ''}`}>
                  <Link href={`/openings/${o.id}`} className="font-medium text-forest-700 hover:text-forest-900 hover:underline">
                    {o.title}
                  </Link>
                </td>
                <td className="p-3 text-ink">{o.department}</td>
                <td className="p-3">
                  {o.candidateCount === 0 ? (
                    <span className="text-slate">—</span>
                  ) : (
                    <span className="text-ink">
                      <span className="font-semibold text-forest-900">{o.activeCandidateCount}</span> active
                      {o.candidateCount > o.activeCandidateCount && (
                        <span className="text-slate"> / {o.candidateCount} total</span>
                      )}
                    </span>
                  )}
                </td>
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
    </>
  );
}
