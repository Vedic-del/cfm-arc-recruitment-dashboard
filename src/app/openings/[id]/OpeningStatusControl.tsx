'use client';

import { useState } from 'react';
import { updateOpeningStatusAction } from './actions';
import { Spinner } from '@/components/Spinner';
import type { OpeningStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: OpeningStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'filled', label: 'Filled' },
  { value: 'closed', label: 'Closed' },
];

export function OpeningStatusControl({ openingId, status }: { openingId: string; status: OpeningStatus }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleChange(newStatus: OpeningStatus) {
    setPending(true);
    setError('');
    try {
      await updateOpeningStatusAction(openingId, newStatus);
    } catch {
      setError('Failed to update status — try again.');
    } finally {
      setPending(false);
    }
  }

  const closedOut = status === 'closed' || status === 'filled';

  return (
    <div className="flex items-center gap-2">
      {closedOut && (
        <button
          onClick={() => handleChange('open')}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Spinner className="h-4 w-4" /> : '↻'} Reopen
        </button>
      )}
      <select
        key={status}
        defaultValue={status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as OpeningStatus)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-forest-900 focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Opening status"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {pending && !closedOut && <Spinner className="h-4 w-4 text-forest-900" />}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
