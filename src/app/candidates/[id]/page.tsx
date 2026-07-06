import Link from 'next/link';
import { getCandidate, getCandidateNotes } from '@/lib/db/candidates';
import { getCandidateOpenings, getPipelineHistory } from '@/lib/db/pipeline';
import { getScorecardsForCandidateOpening } from '@/lib/db/scorecards';
import { listOpenings } from '@/lib/db/openings';
import { linkToOpeningAction, deleteCandidateAction } from './actions';
import { SubmitButton } from '@/components/SubmitButton';
import { ConfirmDeleteForm } from '@/components/ConfirmDeleteForm';
import { NotesSection } from './NotesSection';

const FIELD_LABEL = 'text-xs font-semibold uppercase tracking-wide text-slate';
const FIELD_VALUE = 'text-sm text-ink';

export default async function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate">This candidate no longer exists — they may have been deleted.</p>
        <Link
          href="/candidates"
          className="mt-4 inline-block rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
        >
          Back to candidates
        </Link>
      </div>
    );
  }

  const [candidateOpenings, openings, notes] = await Promise.all([
    getCandidateOpenings(id),
    listOpenings(),
    getCandidateNotes(id),
  ]);
  const boundAction = linkToOpeningAction.bind(null, candidate.id);
  const boundDelete = deleteCandidateAction.bind(null, candidate.id);
  const linkedCount = candidateOpenings.length;

  const pipelineDetails = await Promise.all(
    candidateOpenings.map(async (co) => ({
      co,
      history: await getPipelineHistory(co.id),
      scorecards: await getScorecardsForCandidateOpening(co.id),
    }))
  );

  const fields: [string, string | number | null][] = [
    ['Phone', candidate.phone],
    ['Email', candidate.email],
    ['Location', candidate.location],
    ['Experience (total)', candidate.years_experience_total],
    ['Experience (relevant)', candidate.years_experience_relevant],
    ['Current salary', candidate.current_salary],
    ['Expected salary', candidate.expected_salary],
    ['Notice period', candidate.notice_period],
    ['Source', candidate.source],
    ['Tags', candidate.tags],
  ];

  return (
    <div className="mx-auto max-w-2xl animate-fade-in-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">{candidate.name}</h1>
          <p className="mt-1 text-sm text-slate">
            {candidate.current_designation ?? 'No title on file'}
            {candidate.current_employer ? ` at ${candidate.current_employer}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/candidates/${candidate.id}/edit`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
          >
            Edit
          </Link>
          <ConfirmDeleteForm
            action={boundDelete}
            confirmMessage={
              linkedCount > 0
                ? `Delete ${candidate.name}? They're linked to ${linkedCount} opening${linkedCount === 1 ? '' : 's'} — those pipeline links will be removed too. This can't be undone.`
                : `Delete ${candidate.name}? This can't be undone.`
            }
          />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className={FIELD_LABEL}>{label}</dt>
              <dd className={FIELD_VALUE}>
                {value === null || value === '' ? (
                  '—'
                ) : label === 'Phone' ? (
                  <a href={`tel:${value}`} className="font-medium text-forest-700 hover:underline">{value}</a>
                ) : label === 'Email' ? (
                  <a href={`mailto:${value}`} className="font-medium text-forest-700 hover:underline">{value}</a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
        {candidate.resume_summary && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className={FIELD_LABEL}>Resume summary (AI-extracted)</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{candidate.resume_summary}</p>
          </div>
        )}
      </div>

      <h2 className="mt-8 mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">Notes &amp; activity</h2>
      <NotesSection candidateId={candidate.id} notes={notes} />

      <h2 className="mt-8 mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">Pipeline history</h2>
      {pipelineDetails.length === 0 ? (
        <p className="text-sm text-slate">Not linked to any opening yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pipelineDetails.map(({ co, history, scorecards }) => (
            <div key={co.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-medium text-ink">
                <Link href={`/openings/${co.opening_id}`} className="hover:text-forest-900 hover:underline">
                  {co.openingTitle}
                </Link>{' '}
                <span className="text-slate">—</span> <span className="text-forest-900">{co.current_stage}</span>
              </p>
              {co.outcome_reason && (co.current_stage === 'Rejected' || co.current_stage === 'Dropped') && (
                <p className="mt-1 text-sm text-slate">
                  Reason: <span className="text-ink">{co.outcome_reason}</span>
                </p>
              )}
              {co.next_step || co.next_action_date ? (
                <p className="mt-1 text-sm text-slate">
                  Next step: <span className="text-ink">{co.next_step ?? 'Follow up'}</span>
                  {co.next_action_date && <span> by {co.next_action_date}</span>}
                </p>
              ) : null}
              {co.match_score !== null && (
                <p className="mt-1 text-sm text-slate">
                  Match score: <span className="font-semibold text-forest-900">{co.match_score}/100</span>
                  {co.match_rationale && <span> — {co.match_rationale}</span>}
                </p>
              )}
              <ul className="mt-2 flex flex-col gap-1 text-sm text-slate">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {h.stage} — {new Date(h.entered_at).toLocaleDateString()}
                  </li>
                ))}
              </ul>
              {scorecards.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className={FIELD_LABEL}>Scorecards</p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-sm">
                    {scorecards.map((s) => (
                      <li key={s.id} className="text-ink">
                        <span className="font-medium">{s.stage}:</span>{' '}
                        {s.submitted_at ? (
                          <>
                            {s.score} — {s.comments}
                          </>
                        ) : (
                          <span className="italic text-slate">pending</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate">Link to another opening</h2>
      <form action={boundAction} className="flex gap-2">
        <select
          name="opening_id"
          required
          defaultValue=""
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition"
        >
          <option value="" disabled>Select opening</option>
          {openings.map((o) => (
            <option key={o.id} value={o.id}>{o.title}</option>
          ))}
        </select>
        <SubmitButton pendingText="Linking…" className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60">
          Link
        </SubmitButton>
      </form>
    </div>
  );
}
