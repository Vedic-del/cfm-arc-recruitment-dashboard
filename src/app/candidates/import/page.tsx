import Link from 'next/link';
import { listOpenings } from '@/lib/db/openings';
import { ImportWizard } from './ImportWizard';

export default async function ImportCandidatesPage() {
  const openings = await listOpenings();
  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up">
      <div className="mb-6">
        <Link href="/candidates" className="text-sm font-medium text-forest-700 hover:underline">
          ← Back to candidates
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-forest-950">
          Import candidates
        </h1>
        <p className="mt-1 text-sm text-slate">
          Bring in your existing spreadsheet in one go — no more retyping.
        </p>
      </div>
      <ImportWizard openings={openings} />
    </div>
  );
}
