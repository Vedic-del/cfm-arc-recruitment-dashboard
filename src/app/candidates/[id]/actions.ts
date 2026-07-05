'use server';

import { linkCandidateToOpening } from '@/lib/db/pipeline';
import { deleteCandidate, addCandidateNote } from '@/lib/db/candidates';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function addNoteAction(candidateId: string, note: string): Promise<void> {
  if (!note.trim()) throw new Error('Note cannot be empty');
  await addCandidateNote(candidateId, note.trim());
  revalidatePath(`/candidates/${candidateId}`);
}

export async function linkToOpeningAction(candidateId: string, formData: FormData) {
  const openingId = String(formData.get('opening_id') ?? '');
  if (!openingId) throw new Error('An opening must be selected');
  await linkCandidateToOpening(candidateId, openingId);
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath(`/openings/${openingId}`);
  revalidatePath('/');
}

export async function deleteCandidateAction(candidateId: string) {
  await deleteCandidate(candidateId);
  revalidatePath('/candidates');
  revalidatePath('/');
  redirect('/candidates');
}
