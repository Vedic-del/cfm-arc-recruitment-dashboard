'use server';

import { submitScorecard } from '@/lib/db/scorecards';
import { redirect } from 'next/navigation';

export async function submitScorecardAction(token: string, formData: FormData) {
  const score = String(formData.get('score') ?? '');
  const comments = String(formData.get('comments') ?? '');
  await submitScorecard(token, score, comments);
  redirect(`/scorecard/${token}?submitted=1`);
}
