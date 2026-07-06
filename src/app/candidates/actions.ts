'use server';

import {
  deleteCandidates,
  listAllCandidatesMatching,
  type CandidateFilters,
} from '@/lib/db/candidates';
import {
  getStagesForCandidates,
  bulkAdvanceStageForOpening,
  type CandidateStageInfo,
} from '@/lib/db/pipeline';
import type { Candidate, Stage } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function bulkDeleteCandidatesAction(ids: string[]) {
  await deleteCandidates(ids);
  revalidatePath('/candidates');
  revalidatePath('/');
}

export async function bulkMoveStageAction(
  candidateIds: string[],
  openingId: string,
  stage: Stage,
  reason?: string
): Promise<number> {
  const moved = await bulkAdvanceStageForOpening(candidateIds, openingId, stage, reason);
  revalidatePath('/candidates');
  revalidatePath(`/openings/${openingId}`);
  revalidatePath('/');
  return moved;
}

export async function exportCandidatesAction(
  filters: CandidateFilters
): Promise<{ candidates: Candidate[]; stages: Record<string, CandidateStageInfo[]> }> {
  const candidates = await listAllCandidatesMatching(filters);
  const stages = await getStagesForCandidates(candidates.map((c) => c.id));
  return { candidates, stages };
}
