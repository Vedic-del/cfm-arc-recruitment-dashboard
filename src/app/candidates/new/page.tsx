import { listOpenings } from '@/lib/db/openings';
import { createCandidateAction } from './actions';

const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';
const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate';

export default async function NewCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ openingId?: string }>;
}) {
  const { openingId } = await searchParams;
  const openings = await listOpenings();
  return (
    <div className="mx-auto max-w-xl animate-fade-in-up">
      <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Add Candidate</h1>
      <p className="mt-1 text-sm text-slate">Sourced them for a role? Get them into the repository.</p>

      <form
        action={createCandidateAction}
        encType="multipart/form-data"
        className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className={LABEL}>Opening</label>
          <select name="opening_id" defaultValue={openingId ?? ''} required className={INPUT}>
            <option value="" disabled>Select opening</option>
            {openings.map((o) => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Full name</label>
          <input name="name" placeholder="Candidate's full name" required className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Phone</label>
            <input name="phone" placeholder="Phone" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input name="email" placeholder="Email" className={INPUT} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Location</label>
          <input name="location" placeholder="City" className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Current employer</label>
            <input name="current_employer" placeholder="Company" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Current designation</label>
            <input name="current_designation" placeholder="Job title" className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Experience (total)</label>
            <input name="years_experience_total" type="number" step="0.5" placeholder="Years" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Experience (relevant)</label>
            <input name="years_experience_relevant" type="number" step="0.5" placeholder="Years" className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Current salary (CTC)</label>
            <input name="current_salary" type="number" placeholder="Amount" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Expected salary</label>
            <input name="expected_salary" type="number" placeholder="Amount" className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Notice period</label>
            <input name="notice_period" placeholder="e.g. 30 days" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Source</label>
            <input name="source" placeholder="Referral, portal, etc." className={INPUT} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Tags / notes</label>
          <input name="tags" placeholder="Anything worth remembering" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Resume</label>
          <input name="resume" type="file" accept=".pdf,.doc,.docx" className={`${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-forest-900`} />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
        >
          Add Candidate
        </button>
      </form>
    </div>
  );
}
