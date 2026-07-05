'use server';

import { advanceStage } from '@/lib/db/pipeline';
import { generateScorecard } from '@/lib/db/scorecards';
import { updateOpeningStatus } from '@/lib/db/openings';
import { revalidatePath } from 'next/cache';
import type { Stage } from '@/lib/types';

export async function advanceStageAction(candidateOpeningId: string, openingId: string, newStage: Stage) {
  await advanceStage(candidateOpeningId, newStage);
  revalidatePath(`/openings/${openingId}`);
}

export async function generateScorecardAction(candidateOpeningId: string, stage: Stage): Promise<string> {
  return generateScorecard(candidateOpeningId, stage);
}

export async function markOpeningFilledAction(openingId: string) {
  await updateOpeningStatus(openingId, 'filled');
  revalidatePath(`/openings/${openingId}`);
}
