import { getOpening } from '@/lib/db/openings';
import { updateOpeningAction } from './actions';

const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';
const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate';

export default async function EditOpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opening = await getOpening(id);
  if (!opening) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">Opening not found.</p>
      </div>
    );
  }
  const boundAction = updateOpeningAction.bind(null, opening.id);

  return (
    <div className="mx-auto max-w-xl animate-fade-in-up">
      <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Edit Opening</h1>
      <p className="mt-1 text-sm text-slate">Update the details for {opening.title}.</p>

      <form action={boundAction} className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className={LABEL}>Role title</label>
          <input name="title" defaultValue={opening.title} required className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Department</label>
            <input name="department" defaultValue={opening.department ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Level / grade</label>
            <input name="level" defaultValue={opening.level ?? ''} className={INPUT} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Hiring manager</label>
          <input name="hiring_manager" defaultValue={opening.hiring_manager ?? ''} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Job description</label>
          <textarea name="description" defaultValue={opening.description ?? ''} rows={5} className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Positions</label>
            <input name="positions_count" type="number" defaultValue={opening.positions_count} min={1} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Priority</label>
            <select name="priority" defaultValue={opening.priority} className={INPUT}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL}>Target close date</label>
          <input name="target_close_date" type="date" defaultValue={opening.target_close_date ?? ''} className={INPUT} />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
