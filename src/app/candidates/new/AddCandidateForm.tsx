'use client';

import { useRef, useState } from 'react';
import { checkDuplicatesAction, createCandidateAction, parseResumeAction } from './actions';
import { SubmitButton } from '@/components/SubmitButton';
import { Spinner } from '@/components/Spinner';
import type { Opening } from '@/lib/types';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';
const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate';

interface FieldState {
  name: string;
  phone: string;
  email: string;
  location: string;
  current_employer: string;
  current_designation: string;
  years_experience_total: string;
  years_experience_relevant: string;
  current_salary: string;
  expected_salary: string;
  notice_period: string;
  source: string;
  tags: string;
}

const EMPTY_FIELDS: FieldState = {
  name: '',
  phone: '',
  email: '',
  location: '',
  current_employer: '',
  current_designation: '',
  years_experience_total: '',
  years_experience_relevant: '',
  current_salary: '',
  expected_salary: '',
  notice_period: '',
  source: '',
  tags: '',
};

export function AddCandidateForm({
  openings,
  initialOpeningId,
}: {
  openings: Opening[];
  initialOpeningId: string;
}) {
  const [fields, setFields] = useState<FieldState>(EMPTY_FIELDS);
  const [resumeSummary, setResumeSummary] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsed, setParsed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const duplicateCheckPassed = useRef(false);

  function update(key: keyof FieldState, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    duplicateCheckPassed.current = false;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (duplicateCheckPassed.current) return; // already confirmed — let the action run
    e.preventDefault();
    let duplicates: { name: string; matchedOn: string }[] = [];
    try {
      duplicates = await checkDuplicatesAction({
        name: fields.name,
        email: fields.email || undefined,
        phone: fields.phone || undefined,
      });
    } catch {
      // never block creation on a failed check
    }
    if (duplicates.length > 0) {
      const list = duplicates.map((d) => `• ${d.name} (same ${d.matchedOn})`).join('\n');
      const proceed = confirm(
        `Possible duplicate — this person may already be in the repository:\n\n${list}\n\nAdd them anyway?`
      );
      if (!proceed) return;
    }
    duplicateCheckPassed.current = true;
    formRef.current?.requestSubmit();
  }

  async function handleResumeFile(file: File) {
    setParsing(true);
    setParseError('');
    try {
      const fd = new FormData();
      fd.set('resume', file);
      const result = await parseResumeAction(fd);
      if (!result) {
        setParseError("Couldn't read that file automatically — fill the form in by hand below.");
        return;
      }
      setResumeSummary(result.summary);
      setFields((prev) => ({
        ...prev,
        phone: prev.phone || result.fields.phone || '',
        email: prev.email || result.fields.email || '',
        location: prev.location || result.fields.location || '',
        current_employer: prev.current_employer || result.fields.current_employer || '',
        current_designation: prev.current_designation || result.fields.current_designation || '',
        years_experience_total:
          prev.years_experience_total || (result.fields.years_experience_total?.toString() ?? ''),
        years_experience_relevant:
          prev.years_experience_relevant || (result.fields.years_experience_relevant?.toString() ?? ''),
        current_salary: prev.current_salary || (result.fields.current_salary?.toString() ?? ''),
        expected_salary: prev.expected_salary || (result.fields.expected_salary?.toString() ?? ''),
        notice_period: prev.notice_period || result.fields.notice_period || '',
      }));
      setParsed(true);
    } catch {
      setParseError("Couldn't read that file automatically — fill the form in by hand below.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={createCandidateAction}
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100/60 p-3">
        <label className={LABEL}>Resume (optional, but start here)</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          disabled={parsing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleResumeFile(file);
          }}
          className={`${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-forest-900 disabled:cursor-not-allowed disabled:opacity-60`}
        />
        {parsing && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate">
            <Spinner className="h-3 w-3" />
            Reading resume — filling the form in below, this can take a few seconds…
          </p>
        )}
        {!parsing && parsed && (
          <p className="mt-1.5 text-xs font-medium text-forest-700">
            Form pre-filled from the resume — check it over before saving.
          </p>
        )}
        {!parsing && parseError && <p className="mt-1.5 text-xs text-danger">{parseError}</p>}
        <input type="hidden" name="resume_summary" value={resumeSummary} />
      </div>

      <div>
        <label className={LABEL}>Opening</label>
        <select name="opening_id" defaultValue={initialOpeningId} required className={INPUT}>
          <option value="" disabled>Select opening</option>
          {openings.map((o) => (
            <option key={o.id} value={o.id}>{o.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL}>Full name</label>
        <input
          name="name"
          placeholder="Candidate's full name"
          required
          value={fields.name}
          onChange={(e) => update('name', e.target.value)}
          className={INPUT}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Phone</label>
          <input name="phone" placeholder="Phone" value={fields.phone} onChange={(e) => update('phone', e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Email</label>
          <input name="email" placeholder="Email" value={fields.email} onChange={(e) => update('email', e.target.value)} className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Location</label>
        <input name="location" placeholder="City" value={fields.location} onChange={(e) => update('location', e.target.value)} className={INPUT} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Current employer</label>
          <input
            name="current_employer"
            placeholder="Company"
            value={fields.current_employer}
            onChange={(e) => update('current_employer', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Current designation</label>
          <input
            name="current_designation"
            placeholder="Job title"
            value={fields.current_designation}
            onChange={(e) => update('current_designation', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Experience (total)</label>
          <input
            name="years_experience_total"
            type="number"
            step="0.5"
            placeholder="Years"
            value={fields.years_experience_total}
            onChange={(e) => update('years_experience_total', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Experience (relevant)</label>
          <input
            name="years_experience_relevant"
            type="number"
            step="0.5"
            placeholder="Years"
            value={fields.years_experience_relevant}
            onChange={(e) => update('years_experience_relevant', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Current salary (CTC)</label>
          <input
            name="current_salary"
            type="number"
            placeholder="Amount"
            value={fields.current_salary}
            onChange={(e) => update('current_salary', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Expected salary</label>
          <input
            name="expected_salary"
            type="number"
            placeholder="Amount"
            value={fields.expected_salary}
            onChange={(e) => update('expected_salary', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Notice period</label>
          <input
            name="notice_period"
            placeholder="e.g. 30 days"
            value={fields.notice_period}
            onChange={(e) => update('notice_period', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Source</label>
          <input name="source" placeholder="Referral, portal, etc." value={fields.source} onChange={(e) => update('source', e.target.value)} className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Tags / notes</label>
        <input name="tags" placeholder="Anything worth remembering" value={fields.tags} onChange={(e) => update('tags', e.target.value)} className={INPUT} />
      </div>
      <SubmitButton
        pendingText="Adding candidate…"
        className="mt-2 rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Add Candidate
      </SubmitButton>
    </form>
  );
}
