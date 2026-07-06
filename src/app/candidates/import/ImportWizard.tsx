'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { suggestColumnMappingAction, bulkImportCandidatesAction } from './actions';
import { IMPORT_FIELDS, type ImportSummary } from './fields';
import { Spinner } from '@/components/Spinner';
import type { Opening } from '@/lib/types';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';
const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate';
const CELL_INPUT =
  'w-full min-w-[120px] rounded border border-transparent bg-transparent px-2 py-1 text-sm text-ink hover:border-slate-200 focus:border-forest-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-400/40 transition';

type Step = 'upload' | 'map' | 'done';

function downloadTemplate() {
  const headers = IMPORT_FIELDS.map((f) => f.label).join(',');
  const example = 'Jane Doe,9876543210,jane@example.com,Bangalore,Acme Corp,Senior Analyst,6,5,1800000,2200000,30 days,LinkedIn,Strong SQL';
  const csv = `${headers}\n${example}`;
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'candidate-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportWizard({ openings }: { openings: Opening[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [openingId, setOpeningId] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const nameMapped = useMemo(() => Object.values(mapping).includes('name'), [mapping]);
  const mappedCount = useMemo(
    () => Object.values(mapping).filter((v) => v !== 'ignore').length,
    [mapping]
  );

  async function handleFile(file: File) {
    setParsing(true);
    setError('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        blankrows: false,
        defval: '',
        raw: false,
      });
      if (grid.length < 2) {
        setError('That file needs a header row and at least one data row.');
        setParsing(false);
        return;
      }
      const rawHeaders = (grid[0] as string[]).map((h) => String(h ?? '').trim());
      // Keep only columns that actually have a header.
      const keepIdx = rawHeaders.map((h, i) => (h ? i : -1)).filter((i) => i >= 0);
      const cleanHeaders = keepIdx.map((i) => rawHeaders[i]);
      const dataRows = grid.slice(1).map((r) => keepIdx.map((i) => String((r as string[])[i] ?? '').trim()));

      setFileName(file.name);
      setHeaders(cleanHeaders);
      setRows(dataRows);

      const suggested = await suggestColumnMappingAction(cleanHeaders, dataRows.slice(0, 4));
      setMapping(suggested);
      setStep('map');
    } catch {
      setError("Couldn't read that file. Make sure it's a .csv or .xlsx spreadsheet.");
    } finally {
      setParsing(false);
    }
  }

  function updateCell(rowIdx: number, colIdx: number, value: string) {
    setRows((prev) => {
      const next = prev.slice();
      const row = next[rowIdx].slice();
      row[colIdx] = value;
      next[rowIdx] = row;
      return next;
    });
  }

  async function handleImport() {
    setImporting(true);
    setError('');
    try {
      const objects = rows.map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          const field = mapping[h];
          if (field && field !== 'ignore') obj[field] = row[i] ?? '';
        });
        return obj;
      });
      const result = await bulkImportCandidatesAction(objects, openingId || null, skipDuplicates);
      setSummary(result);
      setStep('done');
      router.refresh();
    } catch {
      setError('Import failed — please try again.');
    } finally {
      setImporting(false);
    }
  }

  if (step === 'done' && summary) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in-up rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <span className="text-2xl text-forest-900">✓</span>
        </div>
        <h2 className="font-display text-lg font-bold text-forest-950">Import complete</h2>
        <p className="mt-2 text-sm text-ink">
          <span className="font-semibold text-forest-900">{summary.created}</span> candidate
          {summary.created === 1 ? '' : 's'} added
          {summary.linkedToOpening ? ' and linked to the opening' : ''}.
        </p>
        {(summary.skippedDuplicates > 0 || summary.skippedEmpty > 0) && (
          <p className="mt-2 text-xs text-slate">
            {summary.skippedDuplicates > 0 && (
              <>Skipped {summary.skippedDuplicates} likely duplicate{summary.skippedDuplicates === 1 ? '' : 's'}. </>
            )}
            {summary.skippedEmpty > 0 && (
              <>Skipped {summary.skippedEmpty} row{summary.skippedEmpty === 1 ? '' : 's'} with no name.</>
            )}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Link
            href="/candidates"
            className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
          >
            View candidates
          </Link>
          <button
            onClick={() => {
              setStep('upload');
              setHeaders([]);
              setRows([]);
              setMapping({});
              setSummary(null);
              setFileName('');
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="animate-fade-in-up">
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
            📄
          </div>
          <h2 className="font-display text-lg font-bold text-forest-950">Upload your spreadsheet</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate">
            Drop in your existing Excel or CSV list of candidates. We&apos;ll read the columns, match
            them to the right fields automatically, and let you review before anything is saved.
          </p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700">
            {parsing ? <Spinner className="h-4 w-4" /> : <span>Choose file</span>}
            {parsing && <span>Reading…</span>}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={parsing}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>
          <p className="mt-3 text-xs text-slate">
            Accepts .xlsx and .csv ·{' '}
            <button onClick={downloadTemplate} className="font-medium text-forest-700 hover:underline">
              Download a template
            </button>
          </p>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      </div>
    );
  }

  // step === 'map'
  return (
    <div className="animate-fade-in-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate">
          <span className="font-medium text-ink">{fileName}</span> · {rows.length} row
          {rows.length === 1 ? '' : 's'} · {mappedCount} column{mappedCount === 1 ? '' : 's'} mapped
        </p>
        <button
          onClick={() => {
            setStep('upload');
            setError('');
          }}
          className="text-sm font-medium text-forest-700 hover:underline"
        >
          ← Choose a different file
        </button>
      </div>

      <div className="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <label className={LABEL}>Link all to opening (optional)</label>
          <select value={openingId} onChange={(e) => setOpeningId(e.target.value)} className={INPUT}>
            <option value="">Don&apos;t link — just add to repository</option>
            {openings.map((o) => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="h-4 w-4"
            />
            Skip likely duplicates (same email, phone, or name)
          </label>
        </div>
      </div>

      {!nameMapped && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-100 px-4 py-2.5 text-sm text-amber-800">
          Map one column to <span className="font-semibold">Full name</span> — it&apos;s required before importing.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100">
              {headers.map((h) => (
                <th key={h} className="p-2 text-left align-top">
                  <span className="mb-1 block px-1 text-xs font-semibold text-slate" title={h}>
                    {h}
                  </span>
                  <select
                    value={mapping[h] ?? 'ignore'}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                    className={`w-full rounded-md border px-2 py-1 text-xs font-medium transition ${
                      mapping[h] && mapping[h] !== 'ignore'
                        ? 'border-forest-700 bg-green-100 text-forest-900'
                        : 'border-slate-200 bg-white text-slate'
                    }`}
                  >
                    <option value="ignore">— Ignore —</option>
                    {IMPORT_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row, ri) => (
              <tr key={ri} className="border-b border-slate-100 last:border-0 hover:bg-slate-100/40">
                {headers.map((h, ci) => {
                  const active = mapping[h] && mapping[h] !== 'ignore';
                  return (
                    <td key={ci} className={active ? '' : 'opacity-40'}>
                      <input
                        value={row[ci] ?? ''}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className={CELL_INPUT}
                        aria-label={`${h} row ${ri + 1}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 100 && (
        <p className="mt-2 text-xs text-slate">
          Showing the first 100 rows for review — all {rows.length} will be imported.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex items-center justify-end gap-2">
        <span className="text-xs text-slate">
          Columns mapped to “Ignore” won&apos;t be imported. You can edit any candidate afterwards.
        </span>
        <button
          onClick={handleImport}
          disabled={!nameMapped || importing}
          className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {importing && <Spinner className="h-4 w-4" />}
          {importing ? 'Importing…' : `Import ${rows.length} candidate${rows.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
