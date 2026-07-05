'use client';

import { useState } from 'react';
import { addNoteAction } from './actions';
import { Spinner } from '@/components/Spinner';
import type { CandidateNote } from '@/lib/types';

export function NotesSection({ candidateId, notes }: { candidateId: string; notes: CandidateNote[] }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!text.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addNoteAction(candidateId, text);
      setText('');
    } catch {
      setError("Couldn't save the note — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleAdd();
            }
          }}
          placeholder="Add a note — screening call, salary discussion, anything worth remembering…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !text.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Spinner className="h-3.5 w-3.5" />}
          {saving ? 'Saving…' : 'Add Note'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {notes.length === 0 ? (
        <p className="mt-4 text-sm italic text-slate">No notes yet — capture what you learn on calls so nothing gets lost.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="border-l-2 border-green-400 pl-3">
              <p className="whitespace-pre-wrap text-sm text-ink">{n.note}</p>
              <p className="mt-0.5 text-xs text-slate">
                {new Date(n.created_at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
