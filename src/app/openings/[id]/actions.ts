'use server';

import { advanceStage, scoreMatch } from '@/lib/db/pipeline';
import { generateScorecard } from '@/lib/db/scorecards';
import { updateOpeningStatus, deleteOpening } from '@/lib/db/openings';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Stage } from '@/lib/types';

export async function advanceStageAction(
  candidateOpeningId: string,
  openingId: string,
  candidateId: string,
  newStage: Stage
) {
  await advanceStage(candidateOpeningId, newStage);
  revalidatePath(`/openings/${openingId}`);
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath('/');
}

export async function generateScorecardAction(candidateOpeningId: string, stage: Stage): Promise<string> {
  return generateScorecard(candidateOpeningId, stage);
}

export async function markOpeningFilledAction(openingId: string) {
  await updateOpeningStatus(openingId, 'filled');
  revalidatePath(`/openings/${openingId}`);
  revalidatePath('/openings');
  revalidatePath('/');
}

export async function scoreMatchAction(candidateOpeningId: string): Promise<{ score: number; rationale: string }> {
  return scoreMatch(candidateOpeningId);
}

export async function deleteOpeningAction(openingId: string) {
  await deleteOpening(openingId);
  revalidatePath('/openings');
  revalidatePath('/');
  redirect('/openings');
}
