'use server';

import {
  deleteCandidates,
  listAllCandidatesMatching,
  type CandidateFilters,
} from '@/lib/db/candidates';
import { getStagesForCandidates, type CandidateStageInfo } from '@/lib/db/pipeline';
import type { Candidate } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function bulkDeleteCandidatesAction(ids: string[]) {
  await deleteCandidates(ids);
  revalidatePath('/candidates');
  revalidatePath('/');
}

export async function exportCandidatesAction(
  filters: CandidateFilters
): Promise<{ candidates: Candidate[]; stages: Record<string, CandidateStageInfo[]> }> {
  const candidates = await listAllCandidatesMatching(filters);
  const stages = await getStagesForCandidates(candidates.map((c) => c.id));
  return { candidates, stages };
}
