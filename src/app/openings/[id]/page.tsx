import Link from 'next/link';
import { getOpening } from '@/lib/db/openings';
import { getPipelineForOpening } from '@/lib/db/pipeline';
import { PipelineBoard } from './PipelineBoard';
import { markOpeningFilledAction } from './actions';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-forest-900',
  on_hold: 'bg-amber-100 text-amber-800',
  closed: 'bg-slate-100 text-slate',
  filled: 'bg-forest-900 text-green-100',
};

export default async function OpeningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opening = await getOpening(id);
  if (!opening) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">Opening not found.</p>
      </div>
    );
  }
  const cards = await getPipelineForOpening(id);
  const boundMarkFilled = markOpeningFilledAction.bind(null, opening.id);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">{opening.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate">
            {opening.department}
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[opening.status] ?? 'bg-slate-100 text-slate'}`}
            >
              {opening.status.replace('_', ' ')}
            </span>
            · Opened {opening.date_opened}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/openings/${opening.id}/edit`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
          >
            Edit
          </Link>
          <Link
            href={`/candidates/new?openingId=${opening.id}`}
            className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
          >
            + Add Candidate
          </Link>
          <form action={boundMarkFilled}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
            >
              Mark Filled
            </button>
          </form>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-slate">Job description</h2>
        {opening.description ? (
          <p className="whitespace-pre-wrap text-sm text-ink">{opening.description}</p>
        ) : (
          <p className="text-sm italic text-slate">No JD added yet — click Edit to add one.</p>
        )}
      </div>

      <PipelineBoard openingId={opening.id} cards={cards} />
    </div>
  );
}
