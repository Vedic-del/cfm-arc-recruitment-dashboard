import Link from 'next/link';
import { findDuplicateGroups } from '@/lib/db/candidates';
import { MergeGroups } from './MergeGroups';

export default async function DuplicatesPage() {
  const groups = await findDuplicateGroups();
  const totalDupes = groups.reduce((sum, g) => sum + g.candidates.length - 1, 0);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up">
      <div className="mb-6">
        <Link href="/candidates" className="text-sm font-medium text-forest-700 hover:underline">
          ← Back to candidates
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-forest-950">Merge duplicates</h1>
        <p className="mt-1 text-sm text-slate">
          {groups.length > 0
            ? `${groups.length} group${groups.length === 1 ? '' : 's'} share an email or phone — ${totalDupes} record${totalDupes === 1 ? '' : 's'} could be merged away.`
            : 'Candidates that share an email or phone number are grouped here so you can combine them.'}
        </p>
      </div>
      <MergeGroups groups={groups} />
    </div>
  );
}
