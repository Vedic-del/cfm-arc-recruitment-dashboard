import Link from 'next/link';
import { getOpening } from '@/lib/db/openings';
import { getPipelineForOpening } from '@/lib/db/pipeline';
import { PipelineBoard } from './PipelineBoard';
import { markOpeningFilledAction } from './actions';

export default async function OpeningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opening = await getOpening(id);
  if (!opening) return <div>Opening not found</div>;
  const cards = await getPipelineForOpening(id);
  const boundMarkFilled = markOpeningFilledAction.bind(null, opening.id);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-semibold">{opening.title}</h1>
          <p className="text-sm text-gray-600">
            {opening.department} · {opening.status} · Opened {opening.date_opened}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/candidates/new?openingId=${opening.id}`}
            className="bg-blue-600 text-white rounded px-4 py-2"
          >
            Add Candidate
          </Link>
          <form action={boundMarkFilled}>
            <button type="submit" className="bg-green-600 text-white rounded px-4 py-2">Mark Filled</button>
          </form>
        </div>
      </div>
      <PipelineBoard openingId={opening.id} cards={cards} />
    </div>
  );
}
