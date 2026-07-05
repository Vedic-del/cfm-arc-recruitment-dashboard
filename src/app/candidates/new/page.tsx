import { listOpenings } from '@/lib/db/openings';
import { AddCandidateForm } from './AddCandidateForm';

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
      <p className="mt-1 text-sm text-slate">Upload their resume and we&apos;ll fill in what we can — review before saving.</p>
      <AddCandidateForm openings={openings} initialOpeningId={openingId ?? ''} />
    </div>
  );
}
