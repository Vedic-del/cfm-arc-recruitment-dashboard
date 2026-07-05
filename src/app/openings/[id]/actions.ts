'use server';

import { advanceStage, scoreMatch, updateNextStep } from '@/lib/db/pipeline';
import { generateScorecard } from '@/lib/db/scorecards';
import { updateOpeningStatus, deleteOpening } from '@/lib/db/openings';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Stage, OpeningStatus } from '@/lib/types';

export async function advanceStageAction(
  candidateOpeningId: string,
  openingId: string,
  candidateId: string,
  newStage: Stage,
  reason?: string
) {
  await advanceStage(candidateOpeningId, newStage, reason);
  revalidatePath(`/openings/${openingId}`);
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath('/');
}

export async function updateNextStepAction(
  candidateOpeningId: string,
  openingId: string,
  nextStep: string | null,
  nextActionDate: string | null
) {
  await updateNextStep(candidateOpeningId, nextStep, nextActionDate);
  revalidatePath(`/openings/${openingId}`);
  revalidatePath('/');
}

export async function generateScorecardAction(candidateOpeningId: string, stage: Stage): Promise<string> {
  return generateScorecard(candidateOpeningId, stage);
}

export async function updateOpeningStatusAction(openingId: string, status: OpeningStatus) {
  await updateOpeningStatus(openingId, status);
  revalidatePath(`/openings/${openingId}`);
  revalidatePath('/openings');
  revalidatePath('/');
}

export async function scoreMatchAction(
  candidateOpeningId: string,
  candidateId: string
): Promise<{ score: number; rationale: string }> {
  const result = await scoreMatch(candidateOpeningId);
  revalidatePath(`/candidates/${candidateId}`);
  return result;
}

export async function deleteOpeningAction(openingId: string) {
  await deleteOpening(openingId);
  revalidatePath('/openings');
  revalidatePath('/');
  redirect('/openings');
}
