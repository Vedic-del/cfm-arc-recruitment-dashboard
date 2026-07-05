'use server';

import { deleteCandidates } from '@/lib/db/candidates';
import { revalidatePath } from 'next/cache';

export async function bulkDeleteCandidatesAction(ids: string[]) {
  await deleteCandidates(ids);
  revalidatePath('/candidates');
  revalidatePath('/');
}
