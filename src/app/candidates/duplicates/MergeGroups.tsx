'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mergeCandidatesAction } from '../actions';
import { Spinner } from '@/components/Spinner';
import type { Candidate } from '@/lib/types';

function score(c: Candidate): number {
  // Prefer the record with the most filled-in fields as the default primary.
  return [
    c.phone, c.email, c.location, c.current_employer, c.current_designation,
    c.years_experience_total, c.current_salary, c.expected_salary, c.notice_period,
    c.source, c.tags,
  ].filter((v) => v !== null && v !== undefined && v !== '').length;
}

function CandidateLine({ c }: { c: Candidate }) {
  return (
    <span className="text-sm">
      <span className="font-medium text-ink">{c.name}</span>
      <span className="text-slate">
        {c.current_designation ? ` · ${c.current_designation}` : ''}
        {c.current_employer ? ` @ ${c.current_employer}` : ''}
        {c.email ? ` · ${c.email}` : ''}
        {c.phone ? ` · ${c.phone}` : ''}
      </span>
    </span>
  );
}

function Group({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [primaryId, setPrimaryId] = useState(
    [...candidates].sort((a, b) => score(b) - score(a))[0].id
  );
  const [merging, setMerging] = useState(false);
  const [done, setDone] = useState(false);

  async function handleMerge() {
    const dupIds = candidates.map((c) => c.id).filter((id) => id !== primaryId);
    if (!confirm(`Merge ${dupIds.length} record(s) into the selected one? The others will be deleted and their pipeline history moved over. This can't be undone.`)) return;
    setMerging(true);
    try {
      await mergeCandidatesAction(primaryId, dupIds);
      setDone(true);
      router.refresh();
    } finally {
      setMerging(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-100/60 p-4 text-sm text-forest-900">
        ✓ Merged — {candidates.length} records combined into one.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">
        {candidates.length} possible duplicates · pick the one to keep
      </p>
      <div className="flex flex-col gap-1.5">
        {candidates.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 hover:bg-slate-100/60">
            <input
              type="radio"
              name={`primary-${candidates[0].id}`}
              checked={primaryId === c.id}
              onChange={() => setPrimaryId(c.id)}
              className="mt-1"
            />
            <CandidateLine c={c} />
          </label>
        ))}
      </div>
      <button
        onClick={handleMerge}
        disabled={merging}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {merging && <Spinner className="h-3.5 w-3.5" />}
        {merging ? 'Merging…' : 'Merge into selected'}
      </button>
    </div>
  );
}

export function MergeGroups({ groups }: { groups: { candidates: Candidate[] }[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
        <h2 className="font-display text-lg font-bold text-forest-950">No duplicates found</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate">
          No two candidates share an email or phone number. Your repository is clean.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <Group key={g.candidates[0].id} candidates={g.candidates} />
      ))}
    </div>
  );
}
