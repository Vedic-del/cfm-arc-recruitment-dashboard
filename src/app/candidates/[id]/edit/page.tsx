import { getCandidate } from '@/lib/db/candidates';
import { updateCandidateAction } from './actions';
import { SubmitButton } from '@/components/SubmitButton';

const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';
const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate';

export default async function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">Candidate not found.</p>
      </div>
    );
  }
  const boundAction = updateCandidateAction.bind(null, candidate.id);

  return (
    <div className="mx-auto max-w-xl animate-fade-in-up">
      <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Edit Candidate</h1>
      <p className="mt-1 text-sm text-slate">Update what you&apos;ve learned about {candidate.name} since sourcing.</p>

      <form action={boundAction} className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className={LABEL}>Full name</label>
          <input name="name" defaultValue={candidate.name} required className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Phone</label>
            <input name="phone" defaultValue={candidate.phone ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input name="email" defaultValue={candidate.email ?? ''} className={INPUT} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Location</label>
          <input name="location" defaultValue={candidate.location ?? ''} className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Current employer</label>
            <input name="current_employer" defaultValue={candidate.current_employer ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Current designation</label>
            <input name="current_designation" defaultValue={candidate.current_designation ?? ''} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Experience (total)</label>
            <input name="years_experience_total" type="number" step="0.5" defaultValue={candidate.years_experience_total ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Experience (relevant)</label>
            <input name="years_experience_relevant" type="number" step="0.5" defaultValue={candidate.years_experience_relevant ?? ''} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Current salary (CTC)</label>
            <input name="current_salary" type="number" defaultValue={candidate.current_salary ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Expected salary</label>
            <input name="expected_salary" type="number" defaultValue={candidate.expected_salary ?? ''} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Notice period</label>
            <input name="notice_period" defaultValue={candidate.notice_period ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Source</label>
            <input name="source" defaultValue={candidate.source ?? ''} className={INPUT} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Tags / notes</label>
          <input name="tags" defaultValue={candidate.tags ?? ''} className={INPUT} />
        </div>
        <SubmitButton pendingText="Saving…" className="mt-2 rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60">
          Save Changes
        </SubmitButton>
      </form>
    </div>
  );
}
