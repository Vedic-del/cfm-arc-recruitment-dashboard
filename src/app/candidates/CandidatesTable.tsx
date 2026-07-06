'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bulkDeleteCandidatesAction, exportCandidatesAction, bulkMoveStageAction } from './actions';
import { Spinner } from '@/components/Spinner';
import { STAGES, type Stage } from '@/lib/types';
import type { Candidate } from '@/lib/types';
import type { CandidateStageInfo } from '@/lib/db/pipeline';
import type { CandidateFilters } from '@/lib/db/candidates';

const ACTIVE_STAGE_BADGE = 'bg-green-100 text-forest-900';
const CLOSED_STAGE_BADGE = 'bg-slate-100 text-slate';

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildCsv(candidates: Candidate[], stagesByCandidate: Record<string, CandidateStageInfo[]>): string {
  const headers = [
    'Name', 'Phone', 'Email', 'Location', 'Current Employer', 'Current Designation',
    'Experience (total)', 'Experience (relevant)', 'Current Salary', 'Expected Salary',
    'Notice Period', 'Source', 'Tags', 'Pipelines',
  ];
  const rows = candidates.map((c) => {
    const pipelines = (stagesByCandidate[c.id] ?? [])
      .map((s) => `${s.openingTitle}: ${s.stage}`)
      .join('; ');
    return [
      c.name, c.phone, c.email, c.location, c.current_employer, c.current_designation,
      c.years_experience_total, c.years_experience_relevant, c.current_salary, c.expected_salary,
      c.notice_period, c.source, c.tags, pipelines,
    ].map(csvEscape).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function downloadCsv(csv: string) {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CandidatesTable({
  candidates,
  stagesByCandidate,
  total,
  rangeLabel,
  exportFilters,
}: {
  candidates: Candidate[];
  stagesByCandidate: Record<string, CandidateStageInfo[]>;
  total: number;
  rangeLabel: string;
  exportFilters: CandidateFilters;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveStage, setMoveStage] = useState<Stage>('Screening');
  const filteredOpeningId = exportFilters.openingId;

  async function handleExport() {
    setExporting(true);
    try {
      const { candidates: all, stages } = await exportCandidatesAction(exportFilters);
      downloadCsv(buildCsv(all, stages));
    } finally {
      setExporting(false);
    }
  }

  async function handleBulkMove() {
    if (!filteredOpeningId) return;
    let reason: string | undefined;
    if (moveStage === 'Rejected' || moveStage === 'Dropped') {
      reason = prompt(`Reason for marking ${selected.size} candidate(s) ${moveStage.toLowerCase()}? (optional)`) ?? undefined;
    }
    setMoving(true);
    try {
      await bulkMoveStageAction(Array.from(selected), filteredOpeningId, moveStage, reason);
      setSelected(new Set());
      router.refresh();
    } finally {
      setMoving(false);
    }
  }

  const allSelected = candidates.length > 0 && selected.size === candidates.length;
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
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  }

  async function handleBulkDelete() {
    const count = selected.size;
    const confirmed = confirm(
      `Delete ${count} candidate${count === 1 ? '' : 's'}? Their pipeline links across any openings will be removed too. This can't be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await bulkDeleteCandidatesAction(Array.from(selected));
      setSelected(new Set());
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {selected.size > 0 ? (
          <div className="flex flex-1 animate-fade-in-up flex-wrap items-center justify-between gap-2 rounded-lg border border-forest-700/30 bg-green-100/60 px-4 py-2.5">
            <span className="text-sm font-medium text-forest-900">{selected.size} selected</span>
            <div className="flex flex-wrap items-center gap-2">
              {filteredOpeningId && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={moveStage}
                    onChange={(e) => setMoveStage(e.target.value as Stage)}
                    disabled={moving}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 disabled:opacity-60"
                    aria-label="Move selected to stage"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkMove}
                    disabled={moving}
                    className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {moving && <Spinner className="h-3.5 w-3.5" />}
                    {moving ? 'Moving…' : 'Move'}
                  </button>
                </div>
              )}
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-white px-3 py-1.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting && <Spinner className="h-3.5 w-3.5" />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate">{rangeLabel}</span>
        )}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting && <Spinner className="h-3.5 w-3.5" />}
          {exporting ? 'Preparing…' : `⬇ Export CSV (${total})`}
        </button>
      </div>
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
                  aria-label="Select all candidates"
                />
              </th>
              <th className="p-3">Name</th>
              <th className="p-3">In Process For</th>
              <th className="p-3">Experience</th>
              <th className="p-3">Expected Salary</th>
              <th className="p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const stages = stagesByCandidate[c.id] ?? [];
              return (
                <tr
                  key={c.id}
                  className={`border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-100/60 ${selected.has(c.id) ? 'bg-green-100/40' : ''}`}
                >
                  <td className="w-10 p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      aria-label={`Select ${c.name}`}
                    />
                  </td>
                  <td className="p-3">
                    <Link href={`/candidates/${c.id}`} className="font-medium text-forest-700 hover:text-forest-900 hover:underline">
                      {c.name}
                    </Link>
                    {(c.current_designation || c.current_employer) && (
                      <p className="mt-0.5 text-xs text-slate">
                        {c.current_designation}
                        {c.current_designation && c.current_employer ? ' · ' : ''}
                        {c.current_employer}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    {stages.length === 0 ? (
                      <span className="text-slate">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {stages.map((s, i) => {
                          const closed = ['Joined', 'Rejected', 'Dropped'].includes(s.stage);
                          return (
                            <span
                              key={i}
                              title={s.openingTitle}
                              className={`inline-block max-w-[220px] truncate rounded-full px-2 py-0.5 text-xs font-medium ${closed ? CLOSED_STAGE_BADGE : ACTIVE_STAGE_BADGE}`}
                            >
                              {s.openingTitle}: {s.stage}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-ink">{c.years_experience_total ?? '—'}</td>
                  <td className="p-3 text-ink">{c.expected_salary ?? '—'}</td>
                  <td className="p-3 text-slate">{c.source ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
