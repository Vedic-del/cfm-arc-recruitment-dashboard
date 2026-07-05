'use server';

import { deleteOpenings } from '@/lib/db/openings';
import { revalidatePath } from 'next/cache';

export async function bulkDeleteOpeningsAction(ids: string[]) {
  await deleteOpenings(ids);
  revalidatePath('/openings');
  revalidatePath('/');
}
